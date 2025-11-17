import _ from 'lodash'
import { World } from '../world/World'
import * as THREE from 'three'
import { IInputReceiver } from '../interfaces/IInputReceiver'
import { IUpdatable } from '../interfaces/IUpdatable'
import { KeyBinding } from '../core/KeyBinding'
import { Character } from '../characters/Character'
import { Utils } from './FunctionLibrary'

export class CameraOperator implements IInputReceiver, IUpdatable {
	public updateOrder: number = 4
	public actions: { [action: string]: KeyBinding }

	private world: World
	public camera: THREE.PerspectiveCamera
	public target: THREE.Vector3
	private sensitivity: THREE.Vector2

	private movementSpeed: number
	private radius: number
	public theta: number
	public phi: number

	private onMouseDownPosition: THREE.Vector2
	private onMouseDownTheta: number
	private onMouseDownPhi: number
	public targetRadius: number = 1

	public upVelocity: number = 0
	public forwardVelocity: number = 0
	public rightVelocity: number = 0

	public followMode: boolean = false
	public characterCaller: Character | null = null

	constructor(
		world: World,
		camera: THREE.PerspectiveCamera,
		sensitivityX: number = 1,
		sensitivityY: number = sensitivityX * 0.8
	) {
		// bind functions
		this.setSensitivity = this.setSensitivity.bind(this)
		this.setRadius = this.setRadius.bind(this)
		this.move = this.move.bind(this)
		this.handleKeyboardEvent = this.handleKeyboardEvent.bind(this)
		this.handleMouseButton = this.handleMouseButton.bind(this)
		this.handleMouseMove = this.handleMouseMove.bind(this)
		this.handleMouseWheel = this.handleMouseWheel.bind(this)
		this.inputReceiverInit = this.inputReceiverInit.bind(this)
		this.inputReceiverUpdate = this.inputReceiverUpdate.bind(this)
		this.update = this.update.bind(this)

		// init
		this.world = world
		this.camera = camera
		this.target = new THREE.Vector3()
		this.sensitivity = new THREE.Vector2(sensitivityX, sensitivityY)

		this.movementSpeed = 0.06
		this.radius = 3
		this.theta = 0
		this.phi = 0

		this.onMouseDownPosition = new THREE.Vector2()
		this.onMouseDownTheta = this.theta
		this.onMouseDownPhi = this.phi

		this.actions = {
			forward: new KeyBinding('KeyW'),
			back: new KeyBinding('KeyS'),
			left: new KeyBinding('KeyA'),
			right: new KeyBinding('KeyD'),
			up: new KeyBinding('KeyE'),
			down: new KeyBinding('KeyQ'),
			fast: new KeyBinding('ShiftLeft'),
		}

		world.registerUpdatable(this)
	}

	public setSensitivity(sensitivityX: number, sensitivityY: number = sensitivityX): void {
		this.sensitivity = new THREE.Vector2(sensitivityX, sensitivityY)
	}

	public setRadius(value: number, instantly: boolean = false): void {
		this.targetRadius = Math.max(0.001, value)
		if (instantly === true) {
			this.radius = value
		}
	}

	public move(deltaX: number, deltaY: number): void {
		this.theta -= deltaX * (this.sensitivity.x / 2)
		this.theta %= 360
		this.phi += deltaY * (this.sensitivity.y / 2)
		this.phi = Math.min(85, Math.max(-85, this.phi))
	}

	public handleKeyboardEvent(event: KeyboardEvent, code: string, pressed: boolean): void {
		// Free camera
		if (code === 'KeyC' && pressed === true && event.shiftKey === true) {
			if (this.characterCaller !== null) {
				this.world.inputManager.setInputReceiver(this.characterCaller)
				this.characterCaller = null
			}
		} else {
			for (const action in this.actions) {
				if (this.actions.hasOwnProperty(action)) {
					const binding = this.actions[action]

					if (_.includes(binding.eventCodes, code)) {
						binding.isPressed = pressed
					}
				}
			}
		}
	}

	public handleMouseButton(event: MouseEvent, code: string, pressed: boolean): void {
		for (const action in this.actions) {
			if (this.actions.hasOwnProperty(action)) {
				const binding = this.actions[action]

				if (_.includes(binding.eventCodes, code)) {
					binding.isPressed = pressed
				}
			}
		}
	}

	public handleMouseMove(event: MouseEvent, deltaX: number, deltaY: number): void {
		this.move(deltaX, deltaY)
	}

	public handleMouseWheel(event: WheelEvent, value: number): void {
		this.world.scrollTheTimeScale(value)
	}

	public inputReceiverInit(): void {
		this.target.copy(this.camera.position)
		this.setRadius(0, true)

		this.world.updateControls([
			{
				keys: ['W', 'S', 'A', 'D'],
				desc: 'Move around',
			},
			{
				keys: ['E', 'Q'],
				desc: 'Move up / down',
			},
			{
				keys: ['Shift'],
				desc: 'Speed up',
			},
			{
				keys: ['Shift', '+', 'C'],
				desc: 'Exit free camera mode',
			},
		])
	}

	public inputReceiverUpdate(timeStep: number): void {
		// Set fly speed
		let speed = this.movementSpeed * (this.actions.fast.isPressed ? timeStep * 600 : timeStep * 60)

		const up = Utils.getUp(this.camera)
		const right = Utils.getRight(this.camera)
		const forward = Utils.getBack(this.camera)

		this.upVelocity = THREE.MathUtils.lerp(
			this.upVelocity,
			+this.actions.up.isPressed - +this.actions.down.isPressed,
			0.3
		)
		this.forwardVelocity = THREE.MathUtils.lerp(
			this.forwardVelocity,
			+this.actions.forward.isPressed - +this.actions.back.isPressed,
			0.3
		)
		this.rightVelocity = THREE.MathUtils.lerp(
			this.rightVelocity,
			+this.actions.right.isPressed - +this.actions.left.isPressed,
			0.3
		)

		this.target.add(up.multiplyScalar(speed * this.upVelocity))
		this.target.add(forward.multiplyScalar(speed * this.forwardVelocity))
		this.target.add(right.multiplyScalar(speed * this.rightVelocity))
	}

	public update(timestep: number, unscaledTimeStep: number): void {
		if (this.followMode === true) {
			this.camera.position.y = THREE.MathUtils.clamp(
				this.camera.position.y,
				this.target.y,
				Number.POSITIVE_INFINITY
			)
			this.camera.lookAt(this.target)
			let newPos = this.target
				.clone()
				.add(
					new THREE.Vector3()
						.subVectors(this.camera.position, this.target)
						.normalize()
						.multiplyScalar(this.targetRadius)
				)
			this.camera.position.x = newPos.x
			this.camera.position.y = newPos.y
			this.camera.position.z = newPos.z
		} else {
			this.radius = THREE.MathUtils.lerp(this.radius, this.targetRadius, 0.1)

			this.camera.position.x =
				this.target.x +
				this.radius * Math.sin((this.theta * Math.PI) / 180) * Math.cos((this.phi * Math.PI) / 180)
			this.camera.position.y = this.target.y + this.radius * Math.sin((this.phi * Math.PI) / 180)
			this.camera.position.z =
				this.target.z +
				this.radius * Math.cos((this.theta * Math.PI) / 180) * Math.cos((this.phi * Math.PI) / 180)
			this.camera.updateMatrix()
			this.camera.lookAt(this.target)
		}
	}
}
