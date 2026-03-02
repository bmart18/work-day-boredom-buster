/**
 * ScoreSystem tracks the current score and persists the all-time high score
 * within a single session.
 */
export class ScoreSystem {
  private current: number = 0
  private high: number = 0

  get score(): number {
    return this.current
  }

  get highScore(): number {
    return this.high
  }

  add(points: number): void {
    if (points < 0) throw new Error('Points must be non-negative')
    this.current += points
    if (this.current > this.high) {
      this.high = this.current
    }
  }

  reset(): void {
    this.current = 0
  }

  resetAll(): void {
    this.current = 0
    this.high = 0
  }
}
