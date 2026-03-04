export const GameStatus = {
  Idle: 'Idle',
  Running: 'Running',
  Paused: 'Paused',
  GameOver: 'GameOver',
} as const

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus]

type TransitionMap = Partial<Record<GameStatus, GameStatus[]>>

const VALID_TRANSITIONS: TransitionMap = {
  [GameStatus.Idle]: [GameStatus.Running],
  [GameStatus.Running]: [GameStatus.Paused, GameStatus.GameOver],
  [GameStatus.Paused]: [GameStatus.Running, GameStatus.Idle],
  [GameStatus.GameOver]: [GameStatus.Idle],
}

export type StateChangeCallback = (from: GameStatus, to: GameStatus) => void

/**
 * StateMachine manages the global lifecycle of a game session.
 *
 * Valid transitions:
 *   Idle      → Running
 *   Running   → Paused | GameOver
 *   Paused    → Running | Idle
 *   GameOver  → Idle
 */
export class StateMachine {
  private current: GameStatus = GameStatus.Idle
  private listeners: StateChangeCallback[] = []

  get state(): GameStatus {
    return this.current
  }

  transition(next: GameStatus): void {
    const allowed = VALID_TRANSITIONS[this.current] ?? []
    if (!allowed.includes(next)) {
      throw new Error(
        `Invalid transition: ${this.current} → ${next}`,
      )
    }
    const prev = this.current
    this.current = next
    for (const cb of this.listeners) {
      cb(prev, next)
    }
  }

  onStateChange(callback: StateChangeCallback): void {
    this.listeners.push(callback)
  }

  offStateChange(callback: StateChangeCallback): void {
    this.listeners = this.listeners.filter((cb) => cb !== callback)
  }
}
