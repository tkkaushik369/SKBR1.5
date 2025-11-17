import { IInputReceiver } from '../interfaces/IInputReceiver'
import { IUpdatable } from '../interfaces/IUpdatable'
import { World } from '../world/World'

export class InputManager implements IUpdatable {
	public updateOrder: number = 3
	public world: World
	public domElement: HTMLElement
	public pointerLock: boolean
	public isLocked: boolean
	public inputReceiver: IInputReceiver | null

	public boundOnMouseDown: (evt: any) => void
	public boundOnMouseMove: (evt: any) => void
	public boundOnMouseUp: (evt: any) => void
	public boundOnMouseWheelMove: (evt: any) => void
	public boundOnPointerlockChange: (evt: any) => void
	public boundOnPointerlockError: (evt: any) => void
	public boundOnKeyDown: (evt: any) => void
	public boundOnKeyUp: (evt: any) => void

	constructor(world: World, domElement: HTMLElement) {
		// bind functions
		this.update = this.update.bind(this)
		this.setInputReceiver = this.setInputReceiver.bind(this)
		this.setPointerLock = this.setPointerLock.bind(this)
		this.onPointerlockChange = this.onPointerlockChange.bind(this)
		this.onPointerlockError = this.onPointerlockError.bind(this)
		this.onMouseDown = this.onMouseDown.bind(this)
		this.onMouseMove = this.onMouseMove.bind(this)
		this.onMouseUp = this.onMouseUp.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onKeyUp = this.onKeyUp.bind(this)
		this.onMouseWheelMove = this.onMouseWheelMove.bind(this)

		// init
		this.world = world
		this.domElement = domElement
		this.pointerLock = world.settings.Pointer_Lock
		this.isLocked = false
		this.inputReceiver = null

		// Bindings for later event use
		// Mouse
		this.boundOnMouseDown = (evt) => this.onMouseDown(evt)
		this.boundOnMouseMove = (evt) => this.onMouseMove(evt)
		this.boundOnMouseUp = (evt) => this.onMouseUp(evt)
		this.boundOnMouseWheelMove = (evt) => this.onMouseWheelMove(evt)

		// Pointer lock
		this.boundOnPointerlockChange = (evt) => this.onPointerlockChange(evt)
		this.boundOnPointerlockError = (evt) => this.onPointerlockError(evt)

		// Keys
		this.boundOnKeyDown = (evt) => this.onKeyDown(evt)
		this.boundOnKeyUp = (evt) => this.onKeyUp(evt)

		// Init event listeners
		// Mouse
		this.domElement.addEventListener('mousedown', this.boundOnMouseDown, false)
		document.addEventListener('wheel', this.boundOnMouseWheelMove, false)
		document.addEventListener('pointerlockchange', this.boundOnPointerlockChange, false)
		document.addEventListener('pointerlockerror', this.boundOnPointerlockError, false)

		// Keys
		document.addEventListener('keydown', this.boundOnKeyDown, false)
		document.addEventListener('keyup', this.boundOnKeyUp, false)

		world.registerUpdatable(this)
	}
	
	public setInputReceiver(receiver: IInputReceiver): void {
		this.inputReceiver = receiver
		this.inputReceiver.inputReceiverInit()
	}

	public setPointerLock(enabled: boolean): void {
		this.pointerLock = enabled
	}

	public onPointerlockChange(event: MouseEvent): void {
		if (document.pointerLockElement === this.domElement) {
			this.domElement.addEventListener('mousemove', this.boundOnMouseMove, false)
			this.domElement.addEventListener('mouseup', this.boundOnMouseUp, false)
			this.isLocked = true
		} else {
			this.domElement.removeEventListener('mousemove', this.boundOnMouseMove, false)
			this.domElement.removeEventListener('mouseup', this.boundOnMouseUp, false)
			this.isLocked = false
		}
	}

	public onPointerlockError(event: MouseEvent): void {
		console.error('PointerLockControls: Unable to use Pointer Lock API')
	}

	public onMouseDown(event: MouseEvent): void {
		if (this.pointerLock) {
			this.domElement.requestPointerLock()
		} else {
			this.domElement.addEventListener('mousemove', this.boundOnMouseMove, false)
			this.domElement.addEventListener('mouseup', this.boundOnMouseUp, false)
		}

		if (this.inputReceiver === null) return
		this.inputReceiver.handleMouseButton(event, 'mouse' + event.button, true)
	}

	public onMouseMove(event: MouseEvent): void {
		if (this.inputReceiver === null) return
		this.inputReceiver.handleMouseMove(event, event.movementX, event.movementY)
	}

	public onMouseUp(event: MouseEvent): void {
		if (!this.pointerLock) {
			this.domElement.removeEventListener('mousemove', this.boundOnMouseMove, false)
			this.domElement.removeEventListener('mouseup', this.boundOnMouseUp, false)
		}

		if (this.inputReceiver === null) return
		this.inputReceiver.handleMouseButton(event, 'mouse' + event.button, false)
	}

	public onKeyDown(event: KeyboardEvent): void {
		if (this.inputReceiver === null) return
		this.inputReceiver.handleKeyboardEvent(event, event.code, true)
	}

	public onKeyUp(event: KeyboardEvent): void {
		if (this.inputReceiver === null) return
		this.inputReceiver.handleKeyboardEvent(event, event.code, false)
	}

	public onMouseWheelMove(event: WheelEvent): void {
		if (this.inputReceiver === null) return
		this.inputReceiver.handleMouseWheel(event, event.deltaY)
	}

	public update(timestep: number, unscaledTimeStep: number): void {
		if (this.inputReceiver === null) {
			if (this.world.cameraOperator !== null) {
				this.setInputReceiver(this.world.cameraOperator)
			}
		} else {
			this.inputReceiver.inputReceiverUpdate(unscaledTimeStep)
		}
	}
}
