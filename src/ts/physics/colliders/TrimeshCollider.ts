import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { Utils } from '../../core/FunctionLibrary'
import { ICollider } from '../../interfaces/ICollider'
import { World } from '../../world/World'

export class TrimeshCollider implements ICollider {
	public rigidBody: RAPIER.RigidBody
	public collider: RAPIER.Collider
	public visual: THREE.Mesh

	public options: { [id: string]: any }

	constructor(world: World, mesh: THREE.Mesh, options: { [id: string]: any }) {
		let defaults = {
			mass: 0,
			position: mesh.position,
			quaternion: mesh.quaternion,
			friction: 0.3,
		}
		options = Utils.setDefaults(options, defaults)
		this.options = options

		const geoInxs = mesh.geometry.getIndex()
		const positions = mesh.geometry.attributes['position'].array
		let vertices: number[] = []
		let indices: Uint32Array = new Uint32Array()

		if (geoInxs !== null) {
			for (let i = 0; i < positions.length / 3; i++) {
				vertices.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
			}
			indices = new Uint32Array(geoInxs.array)
		}

		const vis = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, visible: false }))
		vis.position.copy(options.position)
		vis.quaternion.copy(options.quaternion)
		world.scene.add(vis)

		const phyShape = RAPIER.ColliderDesc.trimesh(
			new Float32Array(vertices),
			new Uint32Array(indices),
			RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES
		)

		const phyDesc = options.mass === 0 ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic()
		phyDesc.setTranslation(options.position.x, options.position.y, options.position.z)
		phyDesc.setRotation(
			new RAPIER.Quaternion(
				options.quaternion.x,
				options.quaternion.y,
				options.quaternion.z,
				options.quaternion.w
			)
		)
		phyDesc.setCanSleep(false)

		this.rigidBody = world.world.createRigidBody(phyDesc)
		this.rigidBody.recomputeMassPropertiesFromColliders()
		this.collider = world.world.createCollider(phyShape, this.rigidBody)
		this.visual = vis
	}
}
