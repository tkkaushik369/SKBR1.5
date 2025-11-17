export class KeyBinding {
	public eventCodes: string[]
	public isPressed: boolean = false
	public justPressed: boolean = false
	public justReleased: boolean = false

	constructor(...code: string[]) {
		this.eventCodes = code
	}
}

export type KeyControls = {
	keys: string[]
	desc: string
}
