export type TickCallback = (delta: number) => void

/** Fixed timestep in milliseconds (default: 1000 / 60 ≈ 16.67 ms). */
const DEFAULT_TICK_MS = 1000 / 60

/**
 * GameLoop drives the game at a deterministic fixed tick rate.
 *
 * Elapsed time is accumulated on each animation frame and the tick callback
 * is called as many times as necessary to consume whole tick intervals,
 * keeping game-logic updates independent of the display frame rate.
 */
export class GameLoop {
  private rafId: number | null = null
  private lastTimestamp: number | null = null
  private accumulator: number = 0
  private readonly tickMs: number
  private tickCallback: TickCallback

  constructor(tickCallback: TickCallback, tickMs: number = DEFAULT_TICK_MS) {
    this.tickCallback = tickCallback
    this.tickMs = tickMs
  }

  start(): void {
    if (this.rafId !== null) return
    this.lastTimestamp = null
    this.accumulator = 0
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.lastTimestamp = null
    this.accumulator = 0
  }

  get running(): boolean {
    return this.rafId !== null
  }

  private loop = (timestamp: number): void => {
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp
      this.rafId = requestAnimationFrame(this.loop)
      return
    }

    const elapsed = timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp
    this.accumulator += elapsed

    while (this.accumulator >= this.tickMs) {
      this.tickCallback(this.tickMs)
      this.accumulator -= this.tickMs
    }

    this.rafId = requestAnimationFrame(this.loop)
  }
}
