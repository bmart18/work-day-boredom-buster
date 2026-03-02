export type TickCallback = (delta: number) => void

export class GameLoop {
  private rafId: number | null = null
  private lastTimestamp: number | null = null
  private tickCallback: TickCallback

  constructor(tickCallback: TickCallback) {
    this.tickCallback = tickCallback
  }

  start(): void {
    if (this.rafId !== null) return
    this.lastTimestamp = null
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.lastTimestamp = null
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
    const delta = timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp
    this.tickCallback(delta)
    this.rafId = requestAnimationFrame(this.loop)
  }
}
