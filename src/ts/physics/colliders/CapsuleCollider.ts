import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { Utils } from '../../core/FunctionLibrary'
import { ICollider } from '../../interfaces/ICollider'
import { World } from '../../world/World'

export class CapsuleCollider implements ICollider {
	public rigidBody: RAPIER.RigidBody
	public collider: RAPIER.Collider
	public visual: THREE.Mesh

	public options: { [id: string]: any }

	constructor(world: World, options: { [id: string]: any }) {
		let defaults = {
			mass: 0,
			position: new THREE.Vector3(),
			quaternion: new THREE.Quaternion(),
			height: 0.5,
			radius: 0.3,
			segments: 8,
			lockRotations: false,
			friction: 0.3,
		}
		options = Utils.setDefaults(options, defaults)
		this.options = options

		const vis = new THREE.Mesh(
			new THREE.CapsuleGeometry(options.radius, options.height, options.segments / 2, options.segments),
			new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, visible: false })
		)
		vis.position.copy(options.position)
		vis.quaternion.copy(options.quaternion)
		world.scene.add(vis)

		const phyShape = RAPIER.ColliderDesc.capsule(options.height / 2, options.radius)
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
		this.rigidBody.lockRotations(options.lockRotations, true)
		this.rigidBody.recomputeMassPropertiesFromColliders()
		this.collider = world.world.createCollider(phyShape, this.rigidBody)
		this.visual = vis
	}
}
