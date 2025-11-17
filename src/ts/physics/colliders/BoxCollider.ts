import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { Utils } from '../../core/FunctionLibrary'
import { ICollider } from '../../interfaces/ICollider'
import { World } from '../../world/World'

export class BoxCollider implements ICollider {
	public rigidBody: RAPIER.RigidBody
	public collider: RAPIER.Collider
	public visual: THREE.Mesh

	public options: { [id: string]: any }

	constructor(world: World, options: { [id: string]: any }) {
		let defaults = {
			mass: 0,
			position: new THREE.Vector3(),
			quaternion: new THREE.Quaternion(),
			size: new THREE.Vector3(0.3, 0.3, 0.3),
			friction: 0.3,
		}
		options = Utils.setDefaults(options, defaults)
		this.options = options

		const vis = new THREE.Mesh(
			new THREE.BoxGeometry(options.size.x * 2, options.size.y * 2, options.size.z * 2),
			new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, visible: false })
		)
		vis.position.copy(options.position)
		vis.quaternion.copy(options.quaternion)
		world.scene.add(vis)

		const phyShape = RAPIER.ColliderDesc.cuboid(options.size.x, options.size.y, options.size.z)
		phyShape.setMass(options.mass)
		phyShape.setFriction(options.friction)

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
