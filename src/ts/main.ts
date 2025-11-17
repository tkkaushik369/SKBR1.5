import RAPIER from '@dimforge/rapier3d-compat'
import { World } from './world/World'

RAPIER.init().then(init)

function init() {
	const world = new World()
	// world.setWorld()
	world.setWorld('../../models/world.glb')
}
