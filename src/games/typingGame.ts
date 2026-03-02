export type TypingStatus = 'running' | 'gameover'

export interface TypingGameState {
  prompt: string
  typed: string
  wpm: number
  accuracy: number
  score: number
  status: TypingStatus
  difficulty: number
  timeRemainingMs: number
}

/** Base points awarded on each prompt completion, before WPM/accuracy bonus. */
export const BASE_SCORE_PER_PROMPT = 50

/** Bonus milliseconds added to the clock on each prompt completion. */
export const BONUS_TIME_ON_COMPLETE_MS = 5_000

/** Score thresholds at which difficulty levels 2 and 3 unlock. */
export const DIFFICULTY_THRESHOLDS = [0, 100, 300] as const

/**
 * Maximum countdown time (ms) for each difficulty level.
 * Index 0 → level 1, index 1 → level 2, index 2 → level 3.
 */
export const MAX_TIME_PER_LEVEL_MS = [60_000, 50_000, 40_000] as const

// ── Prompt pools ────────────────────────────────────────────────────────────

const PROMPTS_D1: readonly string[] = [
  "const greeting = 'hello';",
  'let count = 0;',
  'return result;',
  'console.log(value);',
  'const sum = a + b;',
  'const flag = true;',
  'let name = "Alice";',
  'const pi = 3.14;',
]

const PROMPTS_D2: readonly string[] = [
  'function double(n: number): number { return n * 2; }',
  "const names = ['Alice', 'Bob', 'Carol'];",
  'const filtered = items.filter(x => x > 0);',
  "if (status === 'active') { start(); }",
  'const total = prices.reduce((a, b) => a + b, 0);',
  'export default function App() { return null; }',
]

const PROMPTS_D3: readonly string[] = [
  'export const formatDate = (d: Date): string => d.toISOString().slice(0, 10);',
  "throw new Error('Invalid argument: value must be positive');",
  'const { id, name, email } = user;',
  'const result = data.reduce((acc, val) => acc + val, 0);',
  'type Handler = (event: MouseEvent) => void;',
  "const url = `${baseUrl}/api/v1/${endpoint}`;",
]

function promptsForLevel(level: number): readonly string[] {
  if (level >= 3) return PROMPTS_D3
  if (level >= 2) return PROMPTS_D2
  return PROMPTS_D1
}

/**
 * TypingGame implements a deterministic typing-sprint game.
 *
 * The player must type on-screen code prompts accurately within a countdown
 * timer.  Completing each prompt awards points (base + WPM × accuracy ×
 * difficulty) and extends the clock.  Difficulty ramps automatically as the
 * cumulative score crosses defined thresholds.
 *
 * `tick(deltaMs)` must be called each game-loop frame to advance the timer.
 * `type(char)` processes individual keystrokes; only characters that match
 * the next expected character in the prompt advance the cursor.
 */
export class TypingGame {
  private _prompt: string
  private _typed: string
  private _score: number
  private _status: TypingStatus
  private _difficulty: number
  private _timeRemainingMs: number
  private _elapsedTypingMs: number
  private _keystrokes: number
  private _correctKeystrokes: number
  private _promptStarted: boolean
  private _wpm: number
  private _accuracy: number

  constructor() {
    this._prompt = ''
    this._typed = ''
    this._score = 0
    this._status = 'running'
    this._difficulty = 1
    this._timeRemainingMs = MAX_TIME_PER_LEVEL_MS[0]
    this._elapsedTypingMs = 0
    this._keystrokes = 0
    this._correctKeystrokes = 0
    this._promptStarted = false
    this._wpm = 0
    this._accuracy = 100
    this._prompt = this.pickPrompt()
  }

  get status(): TypingStatus {
    return this._status
  }

  get score(): number {
    return this._score
  }

  get difficulty(): number {
    return this._difficulty
  }

  get wpm(): number {
    return this._wpm
  }

  get accuracy(): number {
    return this._accuracy
  }

  /** Resets to the initial state, ready for a new game. */
  reset(): void {
    this._score = 0
    this._status = 'running'
    this._difficulty = 1
    this._timeRemainingMs = MAX_TIME_PER_LEVEL_MS[0]
    this._elapsedTypingMs = 0
    this._keystrokes = 0
    this._correctKeystrokes = 0
    this._typed = ''
    this._promptStarted = false
    this._wpm = 0
    this._accuracy = 100
    this._prompt = this.pickPrompt()
  }

  /**
   * Advances the countdown timer by `deltaMs` milliseconds.
   * Sets status to `'gameover'` when the timer reaches zero.
   */
  tick(deltaMs: number): void {
    if (this._status !== 'running') return

    if (this._promptStarted) {
      this._elapsedTypingMs += deltaMs
      const elapsedMin = this._elapsedTypingMs / 60_000
      this._wpm =
        elapsedMin > 0 ? Math.round(this._correctKeystrokes / 5 / elapsedMin) : 0
    }

    this._timeRemainingMs -= deltaMs
    if (this._timeRemainingMs <= 0) {
      this._timeRemainingMs = 0
      this._status = 'gameover'
    }
  }

  /**
   * Processes a single typed character.
   * Only characters that match the next expected prompt character advance the
   * cursor; all keystrokes (correct or not) count against accuracy.
   */
  type(char: string): void {
    if (this._status !== 'running') return
    if (!this._promptStarted) {
      this._promptStarted = true
    }

    this._keystrokes++
    const expected = this._prompt[this._typed.length]
    if (char === expected) {
      this._correctKeystrokes++
      this._typed += char
    }

    this._accuracy =
      this._keystrokes > 0
        ? Math.round((this._correctKeystrokes / this._keystrokes) * 100)
        : 100

    if (this._typed === this._prompt) {
      this.onPromptComplete()
    }
  }

  /** Returns an immutable snapshot of the current game state. */
  getState(): TypingGameState {
    return {
      prompt: this._prompt,
      typed: this._typed,
      wpm: this._wpm,
      accuracy: this._accuracy,
      score: this._score,
      status: this._status,
      difficulty: this._difficulty,
      timeRemainingMs: this._timeRemainingMs,
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private onPromptComplete(): void {
    const bonus = Math.round(
      this._wpm * (this._accuracy / 100) * this._difficulty,
    )
    this._score += BASE_SCORE_PER_PROMPT + bonus

    // Ramp difficulty based on cumulative score
    if (this._score >= DIFFICULTY_THRESHOLDS[2]) {
      this._difficulty = 3
    } else if (this._score >= DIFFICULTY_THRESHOLDS[1]) {
      this._difficulty = 2
    }

    // Extend clock (capped at the max for the new difficulty level)
    const cap = MAX_TIME_PER_LEVEL_MS[Math.min(this._difficulty - 1, 2)]
    this._timeRemainingMs = Math.min(this._timeRemainingMs + BONUS_TIME_ON_COMPLETE_MS, cap)

    this.loadNextPrompt()
  }

  private loadNextPrompt(): void {
    this._typed = ''
    this._promptStarted = false
    this._elapsedTypingMs = 0
    this._keystrokes = 0
    this._correctKeystrokes = 0
    this._wpm = 0
    this._accuracy = 100
    this._prompt = this.pickPrompt()
  }

  private pickPrompt(): string {
    const pool = promptsForLevel(this._difficulty)
    return pool[Math.floor(Math.random() * pool.length)]
  }
}
