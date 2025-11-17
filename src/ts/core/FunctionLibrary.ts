import * as THREE from 'three'
import _ from 'lodash'
import { Space } from '../enums/Space'
import { SimulationFrame } from '../physics/spring_simulation/SimulationFrame'
import RAPIER from '@dimforge/rapier3d-compat'

export class Utils {
	static appplyVectorMatrixXZ(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
		return new THREE.Vector3(a.x * b.z + a.z * b.x, b.y, a.z * b.z + -a.x * b.x)
	}

	static round(value: number, decimals: number = 0): number {
		return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
	}

	static roundVector(vector: THREE.Vector3, decimals: number = 0): THREE.Vector3 {
		return new THREE.Vector3(
			this.round(vector.x, decimals),
			this.round(vector.y, decimals),
			this.round(vector.z, decimals)
		)
	}

	static getRight(obj: THREE.Object3D, space: Space = Space.Global): THREE.Vector3 {
		const matrix = this.getMatrix(obj, space)
		return new THREE.Vector3(matrix.elements[0], matrix.elements[1], matrix.elements[2])
	}

	static getUp(obj: THREE.Object3D, space: Space = Space.Global): THREE.Vector3 {
		const matrix = this.getMatrix(obj, space)
		return new THREE.Vector3(matrix.elements[4], matrix.elements[5], matrix.elements[6])
	}

	static getForward(obj: THREE.Object3D, space: Space = Space.Global): THREE.Vector3 {
		const matrix = this.getMatrix(obj, space)
		return new THREE.Vector3(matrix.elements[8], matrix.elements[9], matrix.elements[10])
	}

	static getBack(obj: THREE.Object3D, space: Space = Space.Global): THREE.Vector3 {
		const matrix = this.getMatrix(obj, space)
		return new THREE.Vector3(-matrix.elements[8], -matrix.elements[9], -matrix.elements[10])
	}

	static getMatrix(obj: THREE.Object3D, space: Space): THREE.Matrix4 {
		switch (space) {
			case Space.Local:
				return obj.matrix
			case Space.Global:
				return obj.matrixWorld
		}
	}

	static setupMeshProperties(child: any): void {
		child.castShadow = true
		child.receiveShadow = true

		if (child.material.map !== null) {
			let mat = new THREE.MeshPhongMaterial()
			mat.shininess = 0
			mat.name = child.material.name
			mat.map = child.material.map
			if (mat.map !== null) mat.map.anisotropy = 4
			mat.aoMap = child.material.aoMap
			mat.transparent = child.material.transparent
			child.material = mat
		}
	}

	static setDefaults(options: {}, defaults: {}): {} {
		return _.defaults({}, _.clone(options), defaults)
	}

	static threeVector(vec: RAPIER.Vector3): THREE.Vector3 {
		return new THREE.Vector3(vec.x, vec.y, vec.z)
	}
	static threeQuat(quat: RAPIER.Quaternion): THREE.Quaternion {
		return new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w)
	}

	static rapierVector(vec: THREE.Vector3): RAPIER.Vector3 {
		return new RAPIER.Vector3(vec.x, vec.y, vec.z)
	}

	static rapierQuat(quat: THREE.Quaternion): RAPIER.Quaternion {
		return new RAPIER.Quaternion(quat.x, quat.y, quat.z, quat.w)
	}

	static spring(source: number, dest: number, velocity: number, mass: number, damping: number): SimulationFrame {
		let acceleration = dest - source
		acceleration /= mass
		velocity += acceleration
		velocity *= damping

		let position = source + velocity

		return new SimulationFrame(position, velocity)
	}

	static springV(
		source: THREE.Vector3,
		dest: THREE.Vector3,
		velocity: THREE.Vector3,
		mass: number,
		damping: number
	): void {
		let acceleration = new THREE.Vector3().subVectors(dest, source)
		acceleration.divideScalar(mass)
		velocity.add(acceleration)
		velocity.multiplyScalar(damping)
		source.add(velocity)
	}

	static getAngleBetweenVectors(v1: THREE.Vector3, v2: THREE.Vector3, dotTreshold: number = 0.0005): number {
		let angle: number
		let dot = v1.dot(v2)

		// If dot is close to 1, we'll round angle to zero
		if (dot > 1 - dotTreshold) {
			angle = 0
		} else {
			// Dot too close to -1
			if (dot < -1 + dotTreshold) {
				angle = Math.PI
			} else {
				// Get angle difference in radians
				angle = Math.acos(dot)
			}
		}

		return angle
	}

	static getSignedAngleBetweenVectors(
		v1: THREE.Vector3,
		v2: THREE.Vector3,
		normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
		dotTreshold: number = 0.0005
	): number {
		let angle = this.getAngleBetweenVectors(v1, v2, dotTreshold)

		// Get vector pointing up or down
		let cross = new THREE.Vector3().crossVectors(v1, v2)
		// Compare cross with normal to find out direction
		if (normal.dot(cross) < 0) {
			angle = -angle
		}

		return angle
	}

	static haveSameSigns(n1: number, n2: number): boolean {
		return n1 < 0 === n2 < 0
	}

	static haveDifferentSigns(n1: number, n2: number): boolean {
		return n1 < 0 !== n2 < 0
	}
}
