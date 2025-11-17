import { ISpawnPoint } from '../interfaces/ISpawnPoint'
import * as THREE from 'three'
import { World } from './World'
import { Character } from '../characters/Character'
import { LoadingManager } from '../core/LoadingManager'
import { Utils } from '../core/FunctionLibrary'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'

export class CharacterSpawnPoint implements ISpawnPoint {
	private object: THREE.Object3D

	constructor(object: THREE.Object3D) {
		this.object = object
	}

	public spawn(loadingManager: LoadingManager, world: World): void {
		loadingManager.loadGLTF('../../../models/boxman.glb', (model: GLTF) => {
			let player = new Character()
			player.setGLTF(model, this.object)
			world.add(player)

			/* let worldPos = new THREE.Vector3()
			this.object.getWorldPosition(worldPos)
			console.log(JSON.stringify(worldPos))
			player.setPosition(worldPos.x, worldPos.y + 6, worldPos.z)

			let forward = Utils.getForward(this.object)
			player.setOrientation(forward, true) */

			player.takeControl()
		})
	}
}
