import { StartWalkBase } from './StartWalkBase'
import { Character } from '../Character'

export class StartWalkBackLeft extends StartWalkBase {
	constructor(character: Character) {
		super(character)
		this.animationLength = character.setAnimation('start_back_left', 0.1)
	}
}
