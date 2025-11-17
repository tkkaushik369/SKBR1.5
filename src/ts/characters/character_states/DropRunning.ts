import { CharacterStateBase } from './CharacterStateBase'
import { EndWalk } from './EndWalk'
import { JumpRunning } from './JumpRunning'
import { Sprint } from './Sprint'
import { Walk } from './Walk'
import { ICharacterState } from '../../interfaces/ICharacterState'
import { Character } from '../Character'

export class DropRunning extends CharacterStateBase implements ICharacterState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.onInputChange = this.onInputChange.bind(this)

		// init
		this.character.setArcadeVelocityTarget(0.8)
		this.playAnimation('drop_running', 0.1)
	}

	public update(timeStep: number): void {
		super.update(timeStep)

		this.character.setCameraRelativeOrientationTarget()

		if (this.animationEnded(timeStep)) {
			this.character.setState(/* new */ 'Walk'/* (this.character) */)
		}
	}

	public onInputChange(): void {
		super.onInputChange()

		if (this.noDirection()) {
			this.character.setState(/* new */ 'EndWalk'/* (this.character) */)
		}

		if (this.anyDirection() && this.character.actions.run.justPressed) {
			this.character.setState(/* new */ 'Sprint'/* (this.character) */)
		}

		if (this.character.actions.jump.justPressed) {
			this.character.setState(/* new */ 'JumpRunning'/* (this.character) */)
		}
	}
}
