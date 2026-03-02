import type { InputEventHandler } from '../engine/inputRouter'

export interface GameState {
  [key: string]: unknown
}

export interface Skin {
  initialize(): void
  render(gameState: GameState): void
  bindInput(callback: InputEventHandler): void
  destroy(): void
}
