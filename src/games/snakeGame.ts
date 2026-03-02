export type Direction = 'Up' | 'Down' | 'Left' | 'Right'

export interface Point {
  row: number
  col: number
}

export type SnakeCellType = 'empty' | 'head' | 'snake' | 'food'

export type SnakeStatus = 'running' | 'gameover'

export interface SnakeGameState {
  grid: SnakeCellType[][]
  score: number
  status: SnakeStatus
  rows: number
  cols: number
}

/** Points awarded each time the snake eats food. */
export const POINTS_PER_FOOD = 10

const DEFAULT_ROWS = 20
const DEFAULT_COLS = 20

/**
 * Number of game-loop ticks between each snake move.
 * At 60 fps the default gives ~200 ms per step (5 moves/second).
 */
const DEFAULT_STEPS_PER_MOVE = 12

const OPPOSITE: Record<Direction, Direction> = {
  Up: 'Down',
  Down: 'Up',
  Left: 'Right',
  Right: 'Left',
}

/**
 * SnakeGame implements deterministic grid-based Snake mechanics.
 *
 * The game advances one cell each time `tick()` has been called
 * `stepsPerMove` times, keeping movement speed decoupled from the
 * host game-loop frequency.
 */
export class SnakeGame {
  private body: Point[]
  private direction: Direction
  private nextDirection: Direction
  private food: Point
  private _score: number
  private _status: SnakeStatus
  private stepCounter: number
  private _dirty: boolean
  readonly rows: number
  readonly cols: number
  readonly stepsPerMove: number

  constructor(
    rows: number = DEFAULT_ROWS,
    cols: number = DEFAULT_COLS,
    stepsPerMove: number = DEFAULT_STEPS_PER_MOVE,
  ) {
    this.rows = rows
    this.cols = cols
    this.stepsPerMove = stepsPerMove
    // Initialise fields to satisfy TypeScript; reset() sets real values.
    this.body = []
    this.direction = 'Right'
    this.nextDirection = 'Right'
    this.food = { row: 0, col: 0 }
    this._score = 0
    this._status = 'running'
    this.stepCounter = 0
    this._dirty = true
    this.reset()
  }

  get score(): number {
    return this._score
  }

  get status(): SnakeStatus {
    return this._status
  }

  /**
   * True when the game state has changed since the last `consumeDirty()` call.
   * Use this to skip redundant renders.
   */
  get dirty(): boolean {
    return this._dirty
  }

  /** Clears the dirty flag and returns its previous value. */
  consumeDirty(): boolean {
    const was = this._dirty
    this._dirty = false
    return was
  }

  /**
   * Resets the game to its initial state.
   * The snake starts at the centre of the grid, moving right.
   */
  reset(): void {
    const midRow = Math.floor(this.rows / 2)
    const midCol = Math.floor(this.cols / 2)
    this.body = [
      { row: midRow, col: midCol },
      { row: midRow, col: midCol - 1 },
      { row: midRow, col: midCol - 2 },
    ]
    this.direction = 'Right'
    this.nextDirection = 'Right'
    this._score = 0
    this._status = 'running'
    this.stepCounter = 0
    this._dirty = true
    this.spawnFood()
  }

  /**
   * Queues a direction change.  Reversals (e.g. Right → Left) are ignored
   * so the snake cannot immediately collide with itself.
   */
  setDirection(dir: Direction): void {
    if (OPPOSITE[dir] !== this.direction) {
      this.nextDirection = dir
    }
  }

  /**
   * Advances the game by one loop tick.  The snake moves once every
   * `stepsPerMove` calls; calls in between are no-ops.
   */
  tick(): void {
    if (this._status === 'gameover') return
    this.stepCounter++
    if (this.stepCounter < this.stepsPerMove) return
    this.stepCounter = 0
    this._dirty = true
    this.move()
  }

  /** Returns a snapshot of the current game state for rendering. */
  getState(): SnakeGameState {
    const grid: SnakeCellType[][] = Array.from({ length: this.rows }, () =>
      new Array<SnakeCellType>(this.cols).fill('empty'),
    )
    for (let i = 0; i < this.body.length; i++) {
      const { row, col } = this.body[i]
      grid[row][col] = i === 0 ? 'head' : 'snake'
    }
    grid[this.food.row][this.food.col] = 'food'
    return { grid, score: this._score, status: this._status, rows: this.rows, cols: this.cols }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private move(): void {
    this.direction = this.nextDirection
    const head = this.body[0]
    const newHead = this.nextHead(head)

    // Wall collision
    if (
      newHead.row < 0 ||
      newHead.row >= this.rows ||
      newHead.col < 0 ||
      newHead.col >= this.cols
    ) {
      this._status = 'gameover'
      return
    }

    // Self collision
    if (this.body.some((p) => p.row === newHead.row && p.col === newHead.col)) {
      this._status = 'gameover'
      return
    }

    this.body.unshift(newHead)

    if (newHead.row === this.food.row && newHead.col === this.food.col) {
      // Ate food — grow and score
      this._score += POINTS_PER_FOOD
      this.spawnFood()
    } else {
      this.body.pop()
    }
  }

  private nextHead(head: Point): Point {
    switch (this.direction) {
      case 'Up':
        return { row: head.row - 1, col: head.col }
      case 'Down':
        return { row: head.row + 1, col: head.col }
      case 'Left':
        return { row: head.row, col: head.col - 1 }
      case 'Right':
        return { row: head.row, col: head.col + 1 }
    }
  }

  private spawnFood(): void {
    let candidate: Point
    do {
      candidate = {
        row: Math.floor(Math.random() * this.rows),
        col: Math.floor(Math.random() * this.cols),
      }
    } while (this.body.some((p) => p.row === candidate.row && p.col === candidate.col))
    this.food = candidate
  }
}
