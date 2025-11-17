export abstract class SimulatorBase {
	public mass: any
	public damping: any
	public frameTime: number
	public offset: number
	public abstract cache: any[]

	constructor(fps: number, mass: number, damping: number) {
		// bind function
		this.setFPS = this.setFPS.bind(this)
		this.lastFrame = this.lastFrame.bind(this)
		this.generateFrames = this.generateFrames.bind(this)
		this.getFrame = this.getFrame.bind(this)
		this.simulate = this.simulate.bind(this)

		// init
		this.mass = mass
		this.damping = damping
		this.frameTime = 1 / fps
		this.offset = 0
	}

	public setFPS(value: number): void {
		this.frameTime = 1 / value
	}

	public lastFrame(): any {
		return this.cache[this.cache.length - 1]
	}

	public generateFrames(timeStep: number): void {
		// Update cache
		// Find out how many frames needs to be generated
		let totalTimeStep = this.offset + timeStep
		let framesToGenerate = Math.floor(totalTimeStep / this.frameTime)
		this.offset = totalTimeStep % this.frameTime

		// Generate simulation frames
		if (framesToGenerate > 0) {
			for (let i = 0; i < framesToGenerate; i++) {
				this.cache.push(this.getFrame(i + 1 === framesToGenerate))
			}
			this.cache = this.cache.slice(-2)
		}
	}

	public abstract getFrame(isLastFrame: boolean): any
	public abstract simulate(timeStep: number): void
}
