import { CharacterStateBase } from './CharacterStateBase'
import { Idle } from './Idle'
import { JumpIdle } from './JumpIdle'
import { Walk } from './Walk'
import { Character } from '../Character'
import { ICharacterState } from '../../interfaces/ICharacterState'

export class IdleRotateLeft extends CharacterStateBase implements ICharacterState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.onInputChange = this.onInputChange.bind(this)

		// init
		this.character.rotationSimulator.mass = 30
		this.character.rotationSimulator.damping = 0.6

		this.character.velocitySimulator.damping = 0.6
		this.character.velocitySimulator.mass = 10

		this.character.setArcadeVelocityTarget(0)
		this.playAnimation('rotate_left', 0.1)
	}

	public update(timeStep: number): void {
		super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(/* new */ 'Idle'/* (this.character) */)
		}

		this.fallInAir()
	}

	public onInputChange(): void {
		super.onInputChange()

		if (this.character.actions.jump.justPressed) {
			this.character.setState(/* new */ 'JumpIdle'/* (this.character) */)
		}

		if (this.anyDirection()) {
			if (this.character.velocity.length() > 0.5) {
				this.character.setState(/* new */ 'Walk'/* (this.character) */)
			} else {
				this.setAppropriateStartWalkState()
			}
		}
	}
}
