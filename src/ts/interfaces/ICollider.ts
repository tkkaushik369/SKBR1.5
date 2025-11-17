import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'

export interface ICollider {
	rigidBody: RAPIER.RigidBody
	collider: RAPIER.Collider
	visual: THREE.Mesh
}
