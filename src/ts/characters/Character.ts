import * as THREE from 'three'
import _ from 'lodash'
import { IWorldEntity } from '../interfaces/IWorldEntity'
import { ICharacterState } from '../interfaces/ICharacterState'
import { ICharacterAI } from '../interfaces/ICharacterAI'
import { EntityType } from '../enums/EntityType'
import { World } from '../world/World'
import { KeyBinding } from '../core/KeyBinding'
import { Utils } from '../core/FunctionLibrary'
import { IInputReceiver } from '../interfaces/IInputReceiver'
import { ICollider } from '../interfaces/ICollider'
import { Idle } from './character_states/Idle'
import { JumpIdle } from './character_states/JumpIdle'
import { JumpRunning } from './character_states/JumpRunning'
import { VectorSpringSimulator } from '../physics/spring_simulation/VectorSpringSimulator'
import { RelativeSpringSimulator } from '../physics/spring_simulation/RelativeSpringSimulator'
import { CapsuleCollider } from '../physics/colliders/CapsuleCollider'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { GroundImpactData } from './GroundImpactData'
import RAPIER from '@dimforge/rapier3d-compat'
import { Falling } from './character_states/Falling'
import { DropRolling } from './character_states/DropRolling'
import { DropRunning } from './character_states/DropRunning'
import { Sprint } from './character_states/Sprint'
import { Walk } from './character_states/Walk'
import { EndWalk } from './character_states/EndWalk'
import { DropIdle } from './character_states/DropIdle'
import { StartWalkBackLeft } from './character_states/StartWalkBackLeft'
import { StartWalkBackRight } from './character_states/StartWalkBackRight'
import { StartWalkLeft } from './character_states/StartWalkLeft'
import { StartWalkRight } from './character_states/StartWalkRight'
import { StartWalkForward } from './character_states/StartWalkForward'
import { IdleRotateLeft } from './character_states/IdleRotateLeft'
import { IdleRotateRight } from './character_states/IdleRotateRight'

export class Character extends THREE.Object3D implements IWorldEntity, IInputReceiver {
	public updateOrder: number = 1
	public entityType: EntityType = EntityType.Character
	public actions: { [action: string]: KeyBinding } = {
		up: new KeyBinding('KeyW'),
		down: new KeyBinding('KeyS'),
		left: new KeyBinding('KeyA'),
		right: new KeyBinding('KeyD'),
		run: new KeyBinding('ShiftLeft'),
		jump: new KeyBinding('Space'),
		use: new KeyBinding('KeyE'),
		enter: new KeyBinding('KeyF'),
		enter_passenger: new KeyBinding('KeyG'),
		seat_switch: new KeyBinding('KeyX'),
		primary: new KeyBinding('Mouse0'),
		secondary: new KeyBinding('Mouse1'),
	}

	private world: World | null
	public charState: ICharacterState | null
	public behaviour: ICharacterAI | null

	private height: number
	private tiltContainer: THREE.Group
	private modelContainer: THREE.Group
	public mixer: THREE.AnimationMixer | null
	private orj: THREE.Object3D | null = null

	// Movement
	public acceleration: THREE.Vector3 = new THREE.Vector3()
	public velocity: THREE.Vector3 = new THREE.Vector3()
	public arcadeVelocityInfluence: THREE.Vector3 = new THREE.Vector3()
	public velocityTarget: THREE.Vector3 = new THREE.Vector3()
	public arcadeVelocityIsAdditive: boolean = false

	public defaultVelocitySimulatorDamping: number = 0.8
	public defaultVelocitySimulatorMass: number = 50
	public velocitySimulator: VectorSpringSimulator
	public moveSpeed: number = 4
	public angularVelocity: number = 0
	public orientation: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
	public orientationTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
	public defaultRotationSimulatorDamping: number = 0.5
	public defaultRotationSimulatorMass: number = 10
	public rotationSimulator: RelativeSpringSimulator
	public viewVector: THREE.Vector3 = new THREE.Vector3()
	private characterCapsule: CapsuleCollider | null

	// Ray casting
	private rayResult: THREE.Intersection[]
	public rayResultCollider: ICollider | null
	public rayHasHit: boolean = false
	public rayCastLength: number = 0.57
	public raySafeOffset: number = 0.03
	public wantsToJump: boolean = false
	public justJumped: boolean = false
	public initJumpSpeed: number = -1
	public groundImpactData: GroundImpactData = new GroundImpactData()
	private raycastBox: THREE.Mesh

	private physicsEnabled: boolean = true

	constructor() {
		super()
		// bind functions
		this.setGLTF = this.setGLTF.bind(this)
		this.setState = this.setState.bind(this)
		this.setAnimation = this.setAnimation.bind(this)
		this.setPosition = this.setPosition.bind(this)
		this.setOrientation = this.setOrientation.bind(this)
		this.resetOrientation = this.resetOrientation.bind(this)
		this.setArcadeVelocityTarget = this.setArcadeVelocityTarget.bind(this)
		this.setArcadeVelocityInfluence = this.setArcadeVelocityInfluence.bind(this)
		this.getLocalMovementDirection = this.getLocalMovementDirection.bind(this)
		this.getCameraRelativeMovementVector = this.getCameraRelativeMovementVector.bind(this)
		this.setCameraRelativeOrientationTarget = this.setCameraRelativeOrientationTarget.bind(this)
		this.springMovement = this.springMovement.bind(this)
		this.springRotation = this.springRotation.bind(this)
		this.rotateModel = this.rotateModel.bind(this)
		this.jump = this.jump.bind(this)
		this.triggerAction = this.triggerAction.bind(this)
		this.takeControl = this.takeControl.bind(this)
		this.resetControls = this.resetControls.bind(this)
		this.displayControls = this.displayControls.bind(this)
		this.handleKeyboardEvent = this.handleKeyboardEvent.bind(this)
		this.handleMouseButton = this.handleMouseButton.bind(this)
		this.handleMouseMove = this.handleMouseMove.bind(this)
		this.handleMouseWheel = this.handleMouseWheel.bind(this)
		this.inputReceiverInit = this.inputReceiverInit.bind(this)
		this.inputReceiverUpdate = this.inputReceiverUpdate.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.feetRaycast = this.feetRaycast.bind(this)
		this.preStepOld = this.preStepOld.bind(this)
		this.postStepOld = this.postStepOld.bind(this)
		this.preStep = this.preStep.bind(this)
		this.postStep = this.postStep.bind(this)
		this.update = this.update.bind(this)

		// init
		this.world = null
		this.height = 1
		this.mixer = null
		this.charState = null
		this.behaviour = null

		this.rayResultCollider = null
		this.rayResult = []

		// The visuals group is centered for easy character tilting
		this.tiltContainer = new THREE.Group()
		this.add(this.tiltContainer)

		// Model container is used to reliably ground the character, as animation can alter the position of the model itself
		this.modelContainer = new THREE.Group()
		this.modelContainer.position.y = -0.57
		this.tiltContainer.add(this.modelContainer)

		this.velocitySimulator = new VectorSpringSimulator(
			60,
			this.defaultVelocitySimulatorMass,
			this.defaultVelocitySimulatorDamping
		)
		this.rotationSimulator = new RelativeSpringSimulator(
			60,
			this.defaultRotationSimulatorMass,
			this.defaultRotationSimulatorDamping
		)

		// Physics
		// Player Capsule
		this.characterCapsule = null

		// Ray cast debug
		const boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1)
		const boxMat = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			// wireframe: true,
		})
		this.raycastBox = new THREE.Mesh(boxGeo, boxMat)
		// this.raycastBox.visible = false
	}

	public setGLTF(gltf: GLTF, orj: THREE.Object3D | null) {
		this.orj = orj
		gltf.scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				Utils.setupMeshProperties(child)
			}
		})
		this.modelContainer.add(gltf.scene)
		this.mixer = new THREE.AnimationMixer(gltf.scene)
		this.animations = gltf.animations

		this.setState(/* new */ 'Falling' /* (this) */)
	}

	public setState(state: string /* ICharacterState */): void {
		switch (state) {
			case 'Falling': {
				this.charState = new Falling(this)
				break
			}
			case 'DropRolling': {
				this.charState = new DropRolling(this)
				break
			}
			case 'DropRunning': {
				this.charState = new DropRunning(this)
				break
			}
			case 'Sprint': {
				this.charState = new Sprint(this)
				break
			}
			case 'Walk': {
				this.charState = new Walk(this)
				break
			}
			case 'EndWalk': {
				this.charState = new EndWalk(this)
				break
			}
			case 'DropIdle': {
				this.charState = new DropIdle(this)
				break
			}
			case 'Idle': {
				this.charState = new Idle(this)
				break
			}
			case 'JumpIdle': {
				this.charState = new JumpIdle(this)
				break
			}
			case 'JumpRunning': {
				this.charState = new JumpRunning(this)
				break
			}
			case 'StartWalkBackLeft': {
				this.charState = new StartWalkBackLeft(this)
				break
			}
			case 'StartWalkBackRight': {
				this.charState = new StartWalkBackRight(this)
				break
			}
			case 'StartWalkLeft': {
				this.charState = new StartWalkLeft(this)
				break
			}
			case 'StartWalkRight': {
				this.charState = new StartWalkRight(this)
				break
			}
			case 'StartWalkForward': {
				this.charState = new StartWalkForward(this)
				break
			}
			case 'IdleRotateLeft': {
				this.charState = new IdleRotateLeft(this)
				break
			}
			case 'IdleRotateRight': {
				this.charState = new IdleRotateRight(this)
				break
			}
			default: {
				console.log(`state: ${state}`)
				break
			}
		}
		if (this.charState !== null) this.charState.onInputChange()
	}

	public setAnimation(clipName: string, fadeIn: number): number {
		if (this.mixer !== null) {
			// gltf
			let clip = THREE.AnimationClip.findByName(this.animations, clipName)

			let action = this.mixer.clipAction(clip)
			if (action === null) {
				console.error(`Animation ${clipName} not found!`)
				return 0
			}

			this.mixer.stopAllAction()
			action.fadeIn(fadeIn)
			action.play()

			return action.getClip().duration
		}

		return 0
	}

	public setPosition(x: number, y: number, z: number): void {
		if (this.physicsEnabled) {
			if (this.characterCapsule !== null)
				this.characterCapsule.rigidBody.setTranslation(new RAPIER.Vector3(x, y, z), true)
		} else {
			this.position.x = x
			this.position.y = y
			this.position.z = z
		}
	}

	public setOrientation(vector: THREE.Vector3, instantly: boolean = false): void {
		let lookVector = new THREE.Vector3().copy(vector).setY(0).normalize()
		this.orientationTarget.copy(lookVector)

		if (instantly) {
			this.orientation.copy(lookVector)
		}
	}

	public resetOrientation(): void {
		const forward = Utils.getForward(this)
		this.setOrientation(forward, true)
	}

	public setArcadeVelocityTarget(velZ: number, velX: number = 0, velY: number = 0): void {
		this.velocityTarget.z = velZ
		this.velocityTarget.x = velX
		this.velocityTarget.y = velY
	}

	public setArcadeVelocityInfluence(x: number, y: number = x, z: number = x): void {
		this.arcadeVelocityInfluence.set(x, y, z)
	}

	public getLocalMovementDirection(): THREE.Vector3 {
		const positiveX = this.actions.right.isPressed ? -1 : 0
		const negativeX = this.actions.left.isPressed ? 1 : 0
		const positiveZ = this.actions.up.isPressed ? 1 : 0
		const negativeZ = this.actions.down.isPressed ? -1 : 0

		return new THREE.Vector3(positiveX + negativeX, 0, positiveZ + negativeZ).normalize()
	}

	public getCameraRelativeMovementVector(): THREE.Vector3 {
		const localDirection = this.getLocalMovementDirection()
		const flatViewVector = new THREE.Vector3(this.viewVector.x, 0, this.viewVector.z).normalize()

		return Utils.appplyVectorMatrixXZ(flatViewVector, localDirection)
	}

	public setCameraRelativeOrientationTarget(): void {
		// if (this.vehicleEntryInstance === null) {
		let moveVector = this.getCameraRelativeMovementVector()

		if (moveVector.x === 0 && moveVector.y === 0 && moveVector.z === 0) {
			this.setOrientation(this.orientation)
		} else {
			this.setOrientation(moveVector)
		}
		// }
	}

	public springMovement(timeStep: number): void {
		// Simulator
		this.velocitySimulator.target.copy(this.velocityTarget)
		this.velocitySimulator.simulate(timeStep)

		// Update values
		this.velocity.copy(this.velocitySimulator.position)
		this.acceleration.copy(this.velocitySimulator.velocity)
	}

	public springRotation(timeStep: number): void {
		// Spring rotation
		// Figure out angle between current and target orientation
		let angle = Utils.getSignedAngleBetweenVectors(this.orientation, this.orientationTarget)

		// Simulator
		this.rotationSimulator.target = angle
		this.rotationSimulator.simulate(timeStep)
		let rot = this.rotationSimulator.position

		// Updating values
		this.orientation.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot)
		this.angularVelocity = this.rotationSimulator.velocity
	}

	public rotateModel(): void {
		this.lookAt(
			this.position.x + this.orientation.x,
			this.position.y + this.orientation.y,
			this.position.z + this.orientation.z
		)
		this.tiltContainer.rotation.z = -this.angularVelocity * 2.3 * this.velocity.length()
		this.tiltContainer.position.setY(
			Math.cos(Math.abs(this.angularVelocity * 2.3 * this.velocity.length())) / 2 - 0.5
		)
	}

	public jump(initJumpSpeed: number = -1): void {
		this.wantsToJump = true
		this.initJumpSpeed = initJumpSpeed
	}

	public triggerAction(actionName: string, value: boolean): void {
		// Get action and set it's parameters
		let action = this.actions[actionName]

		if (action.isPressed !== value) {
			// Set value
			action.isPressed = value

			// Reset the 'just' attributes
			action.justPressed = false
			action.justReleased = false

			// Set the 'just' attributes
			if (value) action.justPressed = true
			else action.justReleased = true

			// Tell player to handle states according to new input
			if (this.charState !== null) this.charState.onInputChange()

			// Reset the 'just' attributes
			action.justPressed = false
			action.justReleased = false
		}
	}

	public takeControl(): void {
		if (this.world !== null) {
			this.world.inputManager.setInputReceiver(this)
		} else {
			console.warn("Attempting to take control of a character that doesn't belong to a world.")
		}
	}

	public resetControls(): void {
		for (const action in this.actions) {
			if (this.actions.hasOwnProperty(action)) {
				this.triggerAction(action, false)
			}
		}
	}

	public displayControls(): void {
		if (this.world === null) return
		this.world.updateControls([
			{
				keys: ['W', 'A', 'S', 'D'],
				desc: 'Movement',
			},
			{
				keys: ['Shift'],
				desc: 'Sprint',
			},
			{
				keys: ['Space'],
				desc: 'Jump',
			},
			{
				keys: ['F', 'or', 'G'],
				desc: 'Enter vehicle',
			},
			{
				keys: ['Shift', '+', 'R'],
				desc: 'Respawn',
			},
			{
				keys: ['Shift', '+', 'C'],
				desc: 'Free camera',
			},
		])
	}

	public handleKeyboardEvent(event: KeyboardEvent, code: string, pressed: boolean): void {
		/* if (this.controlledObject !== undefined) {
			this.controlledObject.handleKeyboardEvent(event, code, pressed)
		} else { */
		if (this.world !== null) {
			// Free camera
			if (code === 'KeyC' && pressed === true && event.shiftKey === true) {
				this.resetControls()
				this.world.cameraOperator.characterCaller = this
				this.world.inputManager.setInputReceiver(this.world.cameraOperator)
			} else if (code === 'KeyR' && pressed === true && event.shiftKey === true) {
				this.world.restartScenario()
			} else {
				for (const action in this.actions) {
					if (this.actions.hasOwnProperty(action)) {
						const binding = this.actions[action]

						if (_.includes(binding.eventCodes, code)) {
							this.triggerAction(action, pressed)
						}
					}
				}
			}
		}
		// }
	}

	public handleMouseButton(event: MouseEvent, code: string, pressed: boolean): void {
		/* if (this.controlledObject !== undefined) {
			this.controlledObject.handleMouseButton(event, code, pressed)
		} else { */
		for (const action in this.actions) {
			if (this.actions.hasOwnProperty(action)) {
				const binding = this.actions[action]

				if (_.includes(binding.eventCodes, code)) {
					this.triggerAction(action, pressed)
				}
			}
		}
		// }
	}

	public handleMouseMove(event: MouseEvent, deltaX: number, deltaY: number): void {
		/* if (this.controlledObject !== undefined) {
			this.controlledObject.handleMouseMove(event, deltaX, deltaY)
		} else { */
		if (this.world !== null) this.world.cameraOperator.move(deltaX, deltaY)
		// }
	}

	public handleMouseWheel(event: WheelEvent, value: number): void {
		/* if (this.controlledObject !== undefined) {
			this.controlledObject.handleMouseWheel(event, value)
		} else { */
		if (this.world !== null) this.world.scrollTheTimeScale(value)
		// }
	}

	public inputReceiverInit(): void {
		/* if (this.controlledObject !== undefined) {
			this.controlledObject.inputReceiverInit()
			return
		} */

		if (this.world !== null) {
			this.world.cameraOperator.setRadius(1.6, true)
			this.world.cameraOperator.followMode = false
		}

		this.displayControls()
	}

	public inputReceiverUpdate(timeStep: number): void {
		/* if (this.controlledObject !== undefined) {
			this.controlledObject.inputReceiverUpdate(timeStep)
		} else { */
		if (this.world !== null) {
			// Look in camera's direction
			this.viewVector = new THREE.Vector3().subVectors(this.position, this.world.camera.position)
			this.getWorldPosition(this.world.cameraOperator.target)
		}
		// }
	}

	public addToWorld(world: World): void {
		if (_.includes(world.characters, this)) {
			console.warn('Adding character to a world in which it already exists.')
		} else {
			// Set world
			this.world = world

			// Register character
			this.world.characters.push(this)

			// Register physics
			const pos = new THREE.Vector3()
			if (this.orj !== null) {
				this.orj.getWorldPosition(pos)
				pos.add(new THREE.Vector3(0, 20, 0))
			}

			this.characterCapsule = new CapsuleCollider(world, {
				mass: 1,
				height: 0.5,
				radius: 0.25,
				segments: 8,
				friction: 0.0,
				position: pos,
				lockRotations: true,
			})
			this.world.colliders.push(this.characterCapsule)

			// Add to graphicsWorld
			this.world.scene.add(this)
			this.world.scene.add(this.raycastBox)

			this.world.worldPreStep.push(this.preStep)
			this.world.worldPostStep.push(this.postStep)
			// this.world.worldPreStep.push(this.preStepOld)
			// this.world.worldPostStep.push(this.postStepOld)
		}
	}

	public removeFromWorld(world: World): void {
		if (!_.includes(world.characters, this)) {
			console.warn("Removing character from a world in which it isn't present.")
		} else {
			if (world.inputManager.inputReceiver === this) {
				world.inputManager.inputReceiver = null
			}

			this.world = null

			// Remove from characters
			_.pull(world.characters, this)
			_.pull(world.colliders, this.characterCapsule)

			_.pull(world.worldPreStep, this.preStep)
			_.pull(world.worldPostStep, this.postStep)
			// _.pull(world.worldPreStep, this.preStepOld)
			// _.pull(world.worldPostStep, this.postStepOld)

			// Remove physics
			if (this.characterCapsule !== null) {
				world.world.removeRigidBody(this.characterCapsule.rigidBody)
				world.world.removeCollider(this.characterCapsule.collider, true)
			}

			// Remove visuals
			world.scene.remove(this)
			world.scene.remove(this.raycastBox)
		}
	}

	private preStepOld() {
		if (this.world === null) return
		if (this.characterCapsule === null) return
		const pos = new THREE.Vector3().copy(this.characterCapsule.rigidBody.translation())
		const vel = new THREE.Vector3().copy(this.characterCapsule.rigidBody.linvel())
		let objs: THREE.Object3D[] = []
		for (let i = 0; i < this.world.colliders.length; i++) {
			if (this.characterCapsule.visual !== this.world.colliders[i].visual)
				objs.push(this.world.colliders[i].visual)
		}
		const rayCast = new THREE.Raycaster(
			pos,
			new THREE.Vector3(0, -1, 0),
			this.height / 2 + this.raySafeOffset,
			this.rayCastLength
		)
		this.rayResult = rayCast.intersectObjects(objs)
		this.rayHasHit = this.rayResult.length > 0

		// Jumping
		if (this.wantsToJump && this.rayHasHit) {
			// If initJumpSpeed is set
			if (this.initJumpSpeed > -1) {
				// Flatten velocity
				vel.y = 0

				// Velocity needs to be at least as much as initJumpSpeed
				if (vel.lengthSq() < this.initJumpSpeed ** 2) {
					vel.normalize()
					vel.multiplyScalar(this.initJumpSpeed)
				}
			}

			// Add positive vertical velocity
			vel.y += 4
			//Move above ground
			pos.y += this.raySafeOffset
			// Set flag for postStep and character states
			this.justJumped = true
		}
		//Reset flag
		this.wantsToJump = false

		this.characterCapsule.rigidBody.setTranslation(new RAPIER.Vector3(pos.x, pos.y, pos.z), true)
		this.characterCapsule.rigidBody.setLinvel(new RAPIER.Vector3(vel.x, vel.y, vel.z), true)
	}

	private postStepOld() {
		if (this.world === null) return
		if (this.characterCapsule === null) return

		const pos = new THREE.Vector3().copy(this.characterCapsule.rigidBody.translation())
		const vel = new THREE.Vector3().copy(this.characterCapsule.rigidBody.linvel())
		// Player ray casting
		// Get velocities
		console.log(JSON.stringify(vel), JSON.stringify(this.velocity))
		let simulatedVelocity = new THREE.Vector3().copy(vel)
		let arcadeVelocity = new THREE.Vector3().copy(this.velocity).multiplyScalar(this.moveSpeed)
		arcadeVelocity = Utils.appplyVectorMatrixXZ(this.orientation, arcadeVelocity)

		let newVelocity = new THREE.Vector3(
			THREE.MathUtils.lerp(arcadeVelocity.x, simulatedVelocity.x, this.arcadeVelocityInfluence.x),
			THREE.MathUtils.lerp(arcadeVelocity.y, simulatedVelocity.y, this.arcadeVelocityInfluence.y),
			THREE.MathUtils.lerp(arcadeVelocity.z, simulatedVelocity.z, this.arcadeVelocityInfluence.z)
		)

		// If just jumped, don't stick to ground
		if (this.justJumped) this.justJumped = false
		else {
			// If we're hitting the ground, stick to ground
			if (this.rayHasHit) {
				if (this.raycastBox.visible) this.raycastBox.position.copy(this.rayResult[0].point)
				pos.y = this.rayResult[0].point.y + this.rayCastLength - this.raySafeOffset
				vel.set(newVelocity.x, 0, newVelocity.z)
			} else {
				// If we're in air
				if (this.raycastBox.visible) this.raycastBox.position.set(pos.x, pos.y - this.rayCastLength, pos.z)

				vel.set(newVelocity.x, newVelocity.y, newVelocity.z)
				this.groundImpactData.velocity.set(vel.x, vel.y, vel.z)
			}
		}

		this.characterCapsule.rigidBody.setTranslation(new RAPIER.Vector3(pos.x, pos.y, pos.z), true)
		this.characterCapsule.rigidBody.setLinvel(new RAPIER.Vector3(vel.x, vel.y, vel.z), true)
	}

	private feetRaycast() {
		// Player ray casting
		// Create ray
		if (this.characterCapsule !== null) {
			const pos = this.characterCapsule.rigidBody.translation()
			const start = new THREE.Vector3(pos.x, pos.y, pos.z)
			// const end = new THREE.Vector3().copy(start).sub(new THREE.Vector3(0, -1, 0))
			const end = new THREE.Vector3(0, -1, 0)

			// Cast the ray
			this.rayResult = []
			this.rayResultCollider = null
			const objs: THREE.Mesh[] = []
			if (this.world !== null) {
				for (let i = 0; i < this.world.colliders.length; i++) {
					if (
						this.characterCapsule !== null &&
						this.characterCapsule.visual !== this.world.colliders[i].visual
					)
					objs.push(this.world.colliders[i].visual)
				}

				const rayCast = new THREE.Raycaster(
					start,
					end,
					this.height / 2 + this.raySafeOffset,
					this.rayCastLength
				)
				this.rayResult = rayCast.intersectObjects(objs)
			}
			this.rayHasHit = this.rayResult.length > 0
			if (this.rayHasHit && this.world !== null) {
				const obj = this.rayResult[0].object
				for (let i = 0; i < this.world.colliders.length; i++) {
					if (this.world.colliders[i].visual == obj) {
						this.rayResultCollider = this.world.colliders[i]
						break
					}
				}
			}
		}
	}

	private preStep() {
		this.feetRaycast()

		// Raycast debug
		if (this.rayHasHit) {
			if (this.raycastBox.visible) {
				this.raycastBox.position.copy(this.rayResult[0].point)
			}
		} else {
			if (this.raycastBox.visible) {
				if (this.characterCapsule !== null) {
					const phyPos = this.characterCapsule.rigidBody.translation()
					this.raycastBox.position.set(phyPos.x, phyPos.y - this.rayCastLength - this.raySafeOffset, phyPos.z)
				}
			}
		}
	}

	private postStep() {
		if (this.world === null) return
		if (this.characterCapsule === null) return
		const pos = new THREE.Vector3().copy(this.characterCapsule.rigidBody.translation())
		const vel = new THREE.Vector3().copy(this.characterCapsule.rigidBody.linvel())

		// Get velocities
		let simulatedVelocity = new THREE.Vector3(vel.x, vel.y, vel.z)

		// Take local velocity
		let arcadeVelocity = new THREE.Vector3().copy(this.velocity).multiplyScalar(this.moveSpeed)
		// Turn local into global
		arcadeVelocity = Utils.appplyVectorMatrixXZ(this.orientation, arcadeVelocity)

		let newVelocity = new THREE.Vector3()

		// Additive velocity mode
		if (this.arcadeVelocityIsAdditive) {
			newVelocity.copy(simulatedVelocity)

			let globalVelocityTarget = Utils.appplyVectorMatrixXZ(this.orientation, this.velocityTarget)
			let add = new THREE.Vector3().copy(arcadeVelocity).multiply(this.arcadeVelocityInfluence)

			if (
				Math.abs(simulatedVelocity.x) < Math.abs(globalVelocityTarget.x * this.moveSpeed) ||
				Utils.haveDifferentSigns(simulatedVelocity.x, arcadeVelocity.x)
			) {
				newVelocity.x += add.x
			}
			if (
				Math.abs(simulatedVelocity.y) < Math.abs(globalVelocityTarget.y * this.moveSpeed) ||
				Utils.haveDifferentSigns(simulatedVelocity.y, arcadeVelocity.y)
			) {
				newVelocity.y += add.y
			}
			if (
				Math.abs(simulatedVelocity.z) < Math.abs(globalVelocityTarget.z * this.moveSpeed) ||
				Utils.haveDifferentSigns(simulatedVelocity.z, arcadeVelocity.z)
			) {
				newVelocity.z += add.z
			}
		} else {
			newVelocity = new THREE.Vector3(
				THREE.MathUtils.lerp(simulatedVelocity.x, arcadeVelocity.x, this.arcadeVelocityInfluence.x),
				THREE.MathUtils.lerp(simulatedVelocity.y, arcadeVelocity.y, this.arcadeVelocityInfluence.y),
				THREE.MathUtils.lerp(simulatedVelocity.z, arcadeVelocity.z, this.arcadeVelocityInfluence.z)
			)
		}

		// If we're hitting the ground, stick to ground
		if (this.rayHasHit) {
			// Flatten velocity
			newVelocity.y = 0

			// Move on top of moving objects
			if (this.rayResultCollider !== null && this.rayResultCollider.collider.mass() > 0) {
				const tempVel = this.rayResultCollider.rigidBody.linvel()
				newVelocity.add(Utils.threeVector(tempVel))
			}

			// Measure the normal vector offset from direct "up" vector
			// and transform it into a matrix
			if (this.rayResult[0].normal !== undefined) {
				let up = new THREE.Vector3(0, 1, 0)
				let normal = new THREE.Vector3(
					this.rayResult[0].normal.x,
					this.rayResult[0].normal.y,
					this.rayResult[0].normal.z
				)
				let q = new THREE.Quaternion().setFromUnitVectors(up, normal)
				let m = new THREE.Matrix4().makeRotationFromQuaternion(q)

				// Rotate the velocity vector
				newVelocity.applyMatrix4(m)
			}

			// Apply velocity
			vel.x = newVelocity.x
			vel.y = newVelocity.y
			vel.z = newVelocity.z
			// Ground character
			pos.y = this.rayResult[0].point.y + this.rayCastLength + newVelocity.y / this.world.physicsFrameRate
		} else {
			// If we're in air
			vel.x = newVelocity.x
			vel.y = newVelocity.y
			vel.z = newVelocity.z

			// Save last in-air information
			this.groundImpactData.velocity.x = vel.x
			this.groundImpactData.velocity.y = vel.y
			this.groundImpactData.velocity.z = vel.z
		}

		// Jumping
		if (this.wantsToJump) {
			// If initJumpSpeed is set
			if (this.initJumpSpeed > -1) {
				// Flatten velocity
				vel.y = 0
				let speed = Math.max(this.velocitySimulator.position.length() * 4, this.initJumpSpeed)
				vel.copy(this.orientation.clone().multiplyScalar(speed))
			} else {
				if (this.rayResultCollider !== null) {
					// Moving objects compensation
					const tempVel = this.rayResultCollider.rigidBody.linvel()
					vel.subVectors(tempVel, vel)
				}
			}

			// Add positive vertical velocity
			vel.y += 4
			// Move above ground by 2x safe offset value
			pos.y += this.raySafeOffset * 2
			// Reset flag
			this.wantsToJump = false
		}

		this.characterCapsule.rigidBody.setTranslation(Utils.rapierVector(pos), true)
		this.characterCapsule.rigidBody.setLinvel(Utils.rapierVector(vel), true)
	}

	public update(timestep: number, unscaledTimeStep: number): void {
		if (this.behaviour !== null) this.behaviour.update(timestep)
		// this.vehicleEntryInstance?.update(timestep)
		if (this.charState !== null) this.charState.update(timestep)

		if (this.physicsEnabled) {
			this.springMovement(timestep)
			this.springRotation(timestep)
			this.rotateModel()
		}
		if (this.mixer !== null) this.mixer.update(timestep)

		// Sync physics/graphics
		if (this.characterCapsule !== null) {
			if (this.physicsEnabled) {
				this.position.copy(this.characterCapsule.rigidBody.translation())
			} else {
				let newPos = new THREE.Vector3()
				this.getWorldPosition(newPos)
				this.characterCapsule.rigidBody.setTranslation(Utils.rapierVector(newPos), true)
			}
		}

		this.updateMatrixWorld()
	}
}
