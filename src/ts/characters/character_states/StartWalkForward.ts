import { StartWalkBase } from './StartWalkBase'
import { Character } from '../Character'

export class StartWalkForward extends StartWalkBase {
	constructor(character: Character) {
		super(character)
		this.animationLength = character.setAnimation('start_forward', 0.1)
		console.log(character.animations)
	}
}
