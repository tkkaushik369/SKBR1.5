import $ from 'jquery'
import _ from 'lodash'
import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import { RapierDebugRenderer } from '../utils/RapierDebugRenderer '
import { InputManager } from '../core/InputManager'
import { KeyControls } from '../core/KeyBinding'
import { UIManager } from '../core/UIManager'
import { IUpdatable } from '../interfaces/IUpdatable'
import { ICollider } from '../interfaces/ICollider'
import { IWorldEntity } from '../interfaces/IWorldEntity'
import { CameraOperator } from '../core/CameraOperator'
import { LoadingManager } from '../core/LoadingManager'
import { Utils } from '../core/FunctionLibrary'
import { Scenario } from './Scenario'
import { BoxCollider } from '../physics/colliders/BoxCollider'
import { TrimeshCollider } from '../physics/colliders/TrimeshCollider'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { Path } from './Path'
import { Character } from '../characters/Character'

export class World {
	private renderer: THREE.WebGLRenderer
	public scene: THREE.Scene
	public camera: THREE.PerspectiveCamera
	public world: RAPIER.World
	public worldPreStep: Function[]
	public worldPostStep: Function[]
	private rapierDebugRenderer: RapierDebugRenderer

	public physicsFrameRate: number
	private physicsFrameTime: number
	private physicsMaxPrediction: number

	private clock: THREE.Clock
	private requestDelta: number
	private renderDelta: number
	private logicDelta: number
	private sinceLastFrame: number
	private justRendered: boolean
	public timeScaleTarget: number

	public updatables: IUpdatable[]
	public colliders: ICollider[]
	public lastScenarioID: string | null
	public scenarios: Scenario[]
	public paths: Path[]
	public characters: Character[]

	public settings: { [id: string]: any } = {
		Pointer_Lock: true,
		Mouse_Sensitivity: 0.3,
		Time_Scale: 1,
		Debug_FPS: false,
	}
	private stats: Stats
	private gui: GUI
	public scenarioGUIFolder: GUI

	public inputManager: InputManager
	public cameraOperator: CameraOperator

	constructor() {
		// bind functions
		this.generateHTML = this.generateHTML.bind(this)
		this.updateControls = this.updateControls.bind(this)
		this.createParamsGUI = this.createParamsGUI.bind(this)
		this.setWorld = this.setWorld.bind(this)
		this.loadScene = this.loadScene.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.setWorld = this.setWorld.bind(this)
		this.loadScene = this.loadScene.bind(this)
		this.launchScenario = this.launchScenario.bind(this)
		this.restartScenario = this.restartScenario.bind(this)
		this.clearEntities = this.clearEntities.bind(this)
		this.setTimeScale = this.setTimeScale.bind(this)
		this.add = this.add.bind(this)
		this.registerUpdatable = this.registerUpdatable.bind(this)
		this.remove = this.remove.bind(this)
		this.unregisterUpdatable = this.unregisterUpdatable.bind(this)
		this.scrollTheTimeScale = this.scrollTheTimeScale.bind(this)
		this.render = this.render.bind(this)
		this.update = this.update.bind(this)
		this.updatePhysics = this.updatePhysics.bind(this)

		// init
		this.physicsFrameRate = 60
		this.physicsFrameTime = 1 / this.physicsFrameRate
		this.physicsMaxPrediction = this.physicsFrameRate

		this.worldPreStep = []
		this.worldPostStep = []

		this.updatables = []
		this.colliders = []
		this.lastScenarioID = null
		this.scenarios = []
		this.paths = []
		this.characters = []

		// RenderLoop
		this.clock = new THREE.Clock()
		this.renderDelta = 0
		this.requestDelta = 0
		this.logicDelta = 0
		this.sinceLastFrame = 0
		this.justRendered = false
		this.timeScaleTarget = 1.0

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
		this.renderer.setClearColor(0x000000, 0)
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = 1.0
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		this.renderer.domElement.id = 'canvas'

		this.generateHTML()
		document.body.appendChild(this.renderer.domElement)

		// Three.js scene
		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1010)

		// light
		const dirLight = new THREE.DirectionalLight(0xffffcc, 2)
		dirLight.position.set(10, 1000, 10)
		this.scene.add(dirLight)

		// helper
		this.scene.add(new THREE.AxesHelper(3))

		// Physics
		const gravity = new RAPIER.Vector3(0, -9.81, 0)
		this.world = new RAPIER.World(gravity)

		// Debug
		this.rapierDebugRenderer = new RapierDebugRenderer(this.scene, this.world)
		this.rapierDebugRenderer.enabled = true

		// Stats
		this.stats = new Stats()
		this.stats.dom.id = 'statsBox'
		document.body.appendChild(this.stats.dom)

		// GUI
		this.gui = new GUI()
		this.gui.domElement.id = 'dat-gui-container'
		this.scenarioGUIFolder = this.gui.addFolder('Scenarios')
		document.body.appendChild(this.gui.domElement)

		// Initialization
		this.inputManager = new InputManager(this, this.renderer.domElement)
		this.cameraOperator = new CameraOperator(this, this.camera, this.settings.Mouse_Sensitivity)

		this.createParamsGUI()

		this.render()
	}

	private generateHTML() {
		// Loader
		$(`	<div id="loading-screen">
				<div id="loading-screen-background"></div>
				<h1 id="main-title" class="sb-font">Sketchbook 0.4</h1>
				<div class="cubeWrap">
					<div class="cube">
						<div class="faces1"></div>
						<div class="faces2"></div>     
					</div> 
				</div> 
				<div id="loading-text">Loading...</div>
			</div>
		`).appendTo('body')

		// UI
		$(`	<div id="ui-container" style="display: none;">
				<div class="left-panel">
					<div id="controls" class="panel-segment flex-bottom"></div>
				</div>
			</div>
		`).appendTo('body')
	}

	private createParamsGUI() {
		// Scenario
		this.scenarioGUIFolder.open()

		// World
		let worldFolder = this.gui.addFolder('World')
		worldFolder
			.add(this.settings, 'Time_Scale', 0, 1)
			.listen()
			.onChange((value) => {
				this.timeScaleTarget = value
			})
		// Input
		let settingsFolder = this.gui.addFolder('Settings')
		settingsFolder.add(this.settings, 'Pointer_Lock').onChange((enabled) => {
			this.inputManager.setPointerLock(enabled)
		})
		settingsFolder.add(this.settings, 'Mouse_Sensitivity', 0, 1).onChange((value) => {
			this.cameraOperator.setSensitivity(value, value * 0.8)
		})
		settingsFolder.add(this.settings, 'Debug_FPS').onChange((enabled) => {
			UIManager.setFPSVisible(enabled)
		})

		this.gui.open()
	}

	public updateControls(controls: KeyControls[]): void {
		let html = ''
		html += '<h2 class="controls-title">Controls:</h2>'

		controls.forEach((row) => {
			html += '<div class="ctrl-row">'
			row.keys.forEach((key) => {
				if (key === '+' || key === 'and' || key === 'or' || key === '&') html += '&nbsp;' + key + '&nbsp;'
				else html += '<span class="ctrl-key">' + key + '</span>'
			})

			html += '<span class="ctrl-desc">' + row.desc + '</span></div>'
		})

		const controlsEle = document.getElementById('controls')
		if (controlsEle !== null) controlsEle.innerHTML = html
	}

	public onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
	}

	public setWorld(path: string | null = null) {
		if (path === null) {
			UIManager.setUserInterfaceVisible(true)
			UIManager.setLoadingScreenVisible(false)
		} else {
			let loadingManager = new LoadingManager(this)
			loadingManager.onFinishedCallback = () => {
				this.update(1, 1)
				this.setTimeScale(1)
				UIManager.setUserInterfaceVisible(true)
			}
			loadingManager.loadGLTF(path, (gltf: GLTF) => {
				this.loadScene(loadingManager, gltf)

				this.cameraOperator.target = new THREE.Vector3(1, 3, 5)
				this.cameraOperator.theta = 15
				this.cameraOperator.phi = 30
			})
		}
	}

	private loadScene(loadingManager: LoadingManager, gltf: GLTF): void {
		gltf.scene.traverse((child) => {
			if (child.hasOwnProperty('userData')) {
				if (child instanceof THREE.Mesh) {
					Utils.setupMeshProperties(child)
				}

				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'physics') {
						if (child.userData.hasOwnProperty('type')) {
							if (child.userData.type === 'box') {
								let phys = new BoxCollider(this, {
									size: new THREE.Vector3(child.scale.x, child.scale.y, child.scale.z),
									position: child.position,
									quaternion: child.quaternion,
								})
								this.colliders.push(phys)
							} else if (child.userData.type === 'trimesh' && child instanceof THREE.Mesh) {
								let phys = new TrimeshCollider(this, child, {})
								this.colliders.push(phys)
							}

							child.visible = false
						}
					}

					if (child.userData.data === 'path') {
						this.paths.push(new Path(child))
					}

					if (child.userData.data === 'scenario') {
						this.scenarios.push(new Scenario(child, this))
					}
				}
			}
		})

		this.scene.add(gltf.scene)

		// Launch default scenario
		let defaultScenarioID: string | null = null
		for (const scenario of this.scenarios) {
			if (scenario.default) {
				defaultScenarioID = scenario.id
				break
			}
		}
		if (defaultScenarioID !== null) this.launchScenario(defaultScenarioID, loadingManager)
	}

	public launchScenario(scenarioID: string, loadingManager?: LoadingManager): void {
		this.lastScenarioID = scenarioID
		this.clearEntities()

		// Launch default scenario
		if (!loadingManager) loadingManager = new LoadingManager(this)
		for (const scenario of this.scenarios) {
			if (scenario.id === scenarioID || scenario.spawnAlways) {
				scenario.launch(loadingManager)
			}
		}
	}

	public restartScenario(): void {
		if (this.lastScenarioID !== null) {
			document.exitPointerLock()
			this.launchScenario(this.lastScenarioID)
		} else {
			console.warn("Can't restart scenario. Last scenarioID is undefined.")
		}
	}

	public clearEntities(): void {
		for (let i = 0; i < this.characters.length; i++) {
			this.remove(this.characters[i])
			i--
		}

		/* for (let i = 0; i < this.vehicles.length; i++) {
			this.remove(this.vehicles[i])
			i--
		} */
	}

	public setTimeScale(value: number): void {
		this.settings.Time_Scale = value
		this.timeScaleTarget = value
	}

	public add(worldEntity: IWorldEntity): void {
		worldEntity.addToWorld(this)
		this.registerUpdatable(worldEntity)
	}

	public registerUpdatable(registree: IUpdatable): void {
		this.updatables.push(registree)
		this.updatables.sort((a, b) => (a.updateOrder > b.updateOrder ? 1 : -1))
	}

	public remove(worldEntity: IWorldEntity): void {
		worldEntity.removeFromWorld(this)
		this.unregisterUpdatable(worldEntity)
	}

	public unregisterUpdatable(registree: IUpdatable): void {
		_.pull(this.updatables, registree)
	}

	public scrollTheTimeScale(scrollAmount: number): void {
		// Changing time scale with scroll wheel
		const timeScaleBottomLimit = 0.003
		const timeScaleChangeSpeed = 1.3

		if (scrollAmount > 0) {
			this.timeScaleTarget /= timeScaleChangeSpeed
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = 0
		} else {
			this.timeScaleTarget *= timeScaleChangeSpeed
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = timeScaleBottomLimit
			this.timeScaleTarget = Math.min(this.timeScaleTarget, 1)
		}
	}

	public render() {
		this.requestDelta = this.clock.getDelta()
		requestAnimationFrame(this.render)

		// Getting timeStep
		let unscaledTimeStep = this.requestDelta + this.renderDelta + this.logicDelta
		let timeStep = unscaledTimeStep * this.settings.Time_Scale
		timeStep = Math.min(timeStep, 1 / 30) // min 30 fps

		// Logic
		this.update(timeStep, unscaledTimeStep)

		// Measuring logic time
		this.logicDelta = this.clock.getDelta()

		// Frame limiting
		let interval = 1 / 60
		this.sinceLastFrame += this.requestDelta + this.renderDelta + this.logicDelta
		this.sinceLastFrame %= interval

		// Stats end
		this.stats.end()
		this.stats.begin()

		this.renderer.render(this.scene, this.camera)

		// Measuring render time
		this.renderDelta = this.clock.getDelta()
	}

	public update(timeStep: number, unscaledTimeStep: number) {
		this.updatePhysics(timeStep)

		// Update registred objects
		this.updatables.forEach((entity) => {
			entity.update(timeStep, unscaledTimeStep)
		})

		// Lerp time scale
		this.settings.Time_Scale = THREE.MathUtils.lerp(this.settings.Time_Scale, this.timeScaleTarget, 0.2)
	}

	private updatePhysics(timeStep: number) {
		// Step the physics world
		this.world.timestep = timeStep
		for (let i = 0; i < this.worldPreStep.length; i++) {
			this.worldPreStep[i]()
		}
		this.world.step()
		for (let i = 0; i < this.worldPostStep.length; i++) {
			this.worldPostStep[i]()
		}
		this.rapierDebugRenderer.update()

		this.colliders.forEach((obj) => {
			obj.visual.position.copy(obj.rigidBody.translation())
			obj.visual.quaternion.copy(obj.rigidBody.rotation())
		})

		/* this.characters.forEach((char) => {
			if (this.isOutOfBounds(char.characterCapsule.body.position)) {
				this.outOfBoundsRespawn(char.characterCapsule.body)
			}
		}) */
		/* this.vehicles.forEach((vehicle) => {
			if (this.isOutOfBounds(vehicle.rayCastVehicle.chassisBody.position)) {
				let worldPos = new THREE.Vector3()
				vehicle.spawnPoint.getWorldPosition(worldPos)
				worldPos.y += 1
				this.outOfBoundsRespawn(vehicle.rayCastVehicle.chassisBody, Utils.cannonVector(worldPos))
			}
		}) */
	}
}
