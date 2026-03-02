export const GameInput = {
  Up: 0,
  Down: 1,
  Left: 2,
  Right: 3,
  Confirm: 4,
  TypeCharacter: 5,
  Escape: 6,
} as const

export type GameInput = (typeof GameInput)[keyof typeof GameInput]

export type InputEventHandler = (input: GameInput, char?: string) => void

export class InputRouter {
  private handler: InputEventHandler | null = null

  bind(handler: InputEventHandler): void {
    this.unbind()
    this.handler = handler
    window.addEventListener('keydown', this.onKeyDown)
  }

  unbind(): void {
    this.handler = null
    window.removeEventListener('keydown', this.onKeyDown)
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.handler) return
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        this.handler(GameInput.Up)
        break
      case 'ArrowDown':
        event.preventDefault()
        this.handler(GameInput.Down)
        break
      case 'ArrowLeft':
        event.preventDefault()
        this.handler(GameInput.Left)
        break
      case 'ArrowRight':
        event.preventDefault()
        this.handler(GameInput.Right)
        break
      case 'Escape':
        this.handler(GameInput.Escape)
        break
      case 'Enter':
        event.preventDefault()
        this.handler(GameInput.Confirm)
        break
      default:
        if (event.key.length === 1) {
          this.handler(GameInput.TypeCharacter, event.key)
        }
    }
  }
}
