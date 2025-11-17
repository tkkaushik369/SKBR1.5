import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { LoadingTrackerEntry } from './LoadingTrackerEntry'
import { UIManager } from './UIManager'
import { Scenario } from '../world/Scenario'
import { World } from '../world/World'

export class LoadingManager {
	public firstLoad: boolean = true
	public onFinishedCallback: (() => void) | null = null

	private world: World
	private gltfLoader: GLTFLoader
	private loadingTracker: LoadingTrackerEntry[] = []

	constructor(world: World) {
		// bind functions
		this.loadGLTF = this.loadGLTF.bind(this)
		this.addLoadingEntry = this.addLoadingEntry.bind(this)
		this.doneLoading = this.doneLoading.bind(this)
		this.createWelcomeScreenCallback = this.createWelcomeScreenCallback.bind(this)
		this.getLoadingPercentage = this.getLoadingPercentage.bind(this)
		this.isLoadingDone = this.isLoadingDone.bind(this)

		// init
		this.world = world
		this.gltfLoader = new GLTFLoader()

		this.world.setTimeScale(0)
		UIManager.setUserInterfaceVisible(false)
		UIManager.setLoadingScreenVisible(true)
	}

	public loadGLTF(path: string, onLoadingFinished: (gltf: any) => void): void {
		let trackerEntry = this.addLoadingEntry(path)

		this.gltfLoader.load(
			path,
			(gltf) => {
				onLoadingFinished(gltf)
				this.doneLoading(trackerEntry)
			},
			(xhr) => {
				if (xhr.lengthComputable) {
					trackerEntry.progress = xhr.loaded / xhr.total
				}
			},
			(error) => {
				console.error(error)
			}
		)
	}

	public addLoadingEntry(path: string): LoadingTrackerEntry {
		let entry = new LoadingTrackerEntry(path)
		this.loadingTracker.push(entry)

		return entry
	}

	public doneLoading(trackerEntry: LoadingTrackerEntry): void {
		trackerEntry.finished = true
		trackerEntry.progress = 1

		if (this.isLoadingDone()) {
			if (this.onFinishedCallback !== null) {
				this.onFinishedCallback()
			} else {
				UIManager.setUserInterfaceVisible(true)
			}

			UIManager.setLoadingScreenVisible(false)
		}
	}

	public createWelcomeScreenCallback(scenario: Scenario): void {
		if (this.onFinishedCallback === null) {
			this.onFinishedCallback = () => {
				this.world.update(1, 1)
				this.world.setTimeScale(1)
				UIManager.setUserInterfaceVisible(true)
			}
		}
	}

	private getLoadingPercentage(): number {
		let done = true
		let total = 0
		let finished = 0

		for (const item of this.loadingTracker) {
			total++
			finished += item.progress
			if (!item.finished) done = false
		}

		return (finished / total) * 100
	}

	private isLoadingDone(): boolean {
		for (const entry of this.loadingTracker) {
			if (!entry.finished) return false
		}
		return true
	}
}
