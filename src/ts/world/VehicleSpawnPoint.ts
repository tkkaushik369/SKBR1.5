import { ISpawnPoint } from '../interfaces/ISpawnPoint'
import * as THREE from 'three'
import { World } from './World'
import { Character } from '../characters/Character'
import { LoadingManager } from '../core/LoadingManager'
import { Utils } from '../core/FunctionLibrary'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'

export class VehicleSpawnPoint implements ISpawnPoint {
	private object: THREE.Object3D

	public type: string | null
	public driver: string | null
	public firstAINode: string | null

	constructor(object: THREE.Object3D) {
		this.object = object
		this.type = null
		this.driver = null
		this.firstAINode = null
	}

	public spawn(loadingManager: LoadingManager, world: World): void {
		loadingManager.loadGLTF('./models/' + this.type + '.glb', (model: GLTF) => {
			/* let vehicle: Vehicle = this.getNewVehicleByType(model, this.type)
			vehicle.spawnPoint = this.object

			let worldPos = new THREE.Vector3()
			let worldQuat = new THREE.Quaternion()
			this.object.getWorldPosition(worldPos)
			this.object.getWorldQuaternion(worldQuat)

			vehicle.setPosition(worldPos.x, worldPos.y + 1, worldPos.z)
			vehicle.collision.quaternion.copy(Utils.cannonQuat(worldQuat))
			world.add(vehicle) */

			/* if (this.driver !== undefined) {
				loadingManager.loadGLTF('build/assets/boxman.glb', (charModel) => {
					let character = new Character(charModel)
					world.add(character)
					character.teleportToVehicle(vehicle, vehicle.seats[0])

					if (this.driver === 'player') {
						character.takeControl()
					} else if (this.driver === 'ai') {
						if (this.firstAINode !== undefined) {
							let nodeFound = false
							for (const pathName in world.paths) {
								if (world.paths.hasOwnProperty(pathName)) {
									const path = world.paths[pathName]

									for (const nodeName in path.nodes) {
										if (Object.prototype.hasOwnProperty.call(path.nodes, nodeName)) {
											const node = path.nodes[nodeName]

											if (node.object.name === this.firstAINode) {
												character.setBehaviour(new FollowPath(node, 10))
												nodeFound = true
											}
										}
									}
								}
							}

							if (!nodeFound) {
								console.error('Path node ' + this.firstAINode + 'not found.')
							}
						}
					}
				})
			} */
		})
	}
}
