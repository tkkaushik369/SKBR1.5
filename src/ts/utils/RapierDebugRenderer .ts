import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

export class RapierDebugRenderer {
	public mesh: THREE.LineSegments
	public world: RAPIER.World
	public enabled = true

	constructor(scene: THREE.Scene, world: RAPIER.World) {
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.world = world
		this.mesh = new THREE.LineSegments(
			new THREE.BufferGeometry(),
			new THREE.LineBasicMaterial({ color: 0xffffff, vertexColors: true })
		)
		this.mesh.frustumCulled = false
		scene.add(this.mesh)
	}

	public update() {
		if (this.enabled) {
			const { vertices, colors } = this.world.debugRender()
			this.mesh.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
			this.mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
			this.mesh.visible = true
		} else {
			this.mesh.visible = false
		}
	}
}
