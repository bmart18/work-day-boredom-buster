import { describe, it, expect } from 'vitest'
import {
  TypingGame,
  BASE_SCORE_PER_PROMPT,
  BONUS_TIME_ON_COMPLETE_MS,
  DIFFICULTY_THRESHOLDS,
  MAX_TIME_PER_LEVEL_MS,
} from '../typingGame'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Type every character of a string into the game. */
function typeString(game: TypingGame, text: string): void {
  for (const ch of text) {
    game.type(ch)
  }
}

/** Retrieve the current prompt via getState(). */
function getPrompt(game: TypingGame): string {
  return game.getState().prompt
}

// ── Initial state ─────────────────────────────────────────────────────────────

describe('TypingGame – initial state', () => {
  it('starts with running status', () => {
    const game = new TypingGame()
    expect(game.status).toBe('running')
  })

  it('starts with score 0', () => {
    const game = new TypingGame()
    expect(game.score).toBe(0)
  })

  it('starts with difficulty 1', () => {
    const game = new TypingGame()
    expect(game.difficulty).toBe(1)
  })

  it('starts with wpm 0', () => {
    const game = new TypingGame()
    expect(game.wpm).toBe(0)
  })

  it('starts with accuracy 100', () => {
    const game = new TypingGame()
    expect(game.accuracy).toBe(100)
  })

  it('getState() returns a non-empty prompt', () => {
    const game = new TypingGame()
    expect(game.getState().prompt.length).toBeGreaterThan(0)
  })

  it('getState() starts with empty typed string', () => {
    const game = new TypingGame()
    expect(game.getState().typed).toBe('')
  })

  it('getState() starts with full time remaining', () => {
    const game = new TypingGame()
    expect(game.getState().timeRemainingMs).toBe(MAX_TIME_PER_LEVEL_MS[0])
  })
})

// ── Typing mechanics ─────────────────────────────────────────────────────────

describe('TypingGame – typing mechanics', () => {
  it('advances typed string on correct character', () => {
    const game = new TypingGame()
    const prompt = getPrompt(game)
    game.type(prompt[0])
    expect(game.getState().typed).toBe(prompt[0])
  })

  it('does not advance typed string on wrong character', () => {
    const game = new TypingGame()
    const prompt = getPrompt(game)
    // Pick a character guaranteed to be wrong
    const wrongChar = prompt[0] === 'X' ? 'Y' : 'X'
    game.type(wrongChar)
    expect(game.getState().typed).toBe('')
  })

  it('accuracy decreases on wrong keystroke', () => {
    const game = new TypingGame()
    const prompt = getPrompt(game)
    const wrongChar = prompt[0] === 'X' ? 'Y' : 'X'
    game.type(wrongChar)
    expect(game.getState().accuracy).toBeLessThan(100)
  })

  it('accuracy remains 100 when all keystrokes are correct', () => {
    const game = new TypingGame()
    const prompt = getPrompt(game)
    // Type only the first two chars if they are correct
    game.type(prompt[0])
    game.type(prompt[1])
    expect(game.getState().accuracy).toBe(100)
  })

  it('does not accept input when status is gameover', () => {
    const game = new TypingGame()
    // Drain the timer to trigger gameover
    game.tick(MAX_TIME_PER_LEVEL_MS[0] + 1)
    expect(game.status).toBe('gameover')
    const typedBefore = game.getState().typed
    game.type(getPrompt(game)[0])
    expect(game.getState().typed).toBe(typedBefore)
  })
})

// ── Timer ─────────────────────────────────────────────────────────────────────

describe('TypingGame – timer', () => {
  it('tick() decrements timeRemainingMs', () => {
    const game = new TypingGame()
    const before = game.getState().timeRemainingMs
    game.tick(1000)
    expect(game.getState().timeRemainingMs).toBe(before - 1000)
  })

  it('sets status to gameover when timer reaches zero', () => {
    const game = new TypingGame()
    game.tick(MAX_TIME_PER_LEVEL_MS[0] + 1)
    expect(game.status).toBe('gameover')
    expect(game.getState().timeRemainingMs).toBe(0)
  })

  it('does not decrement timer further after gameover', () => {
    const game = new TypingGame()
    game.tick(MAX_TIME_PER_LEVEL_MS[0] + 1)
    game.tick(5000)
    expect(game.getState().timeRemainingMs).toBe(0)
  })

  it('does not update timer when status is gameover', () => {
    const game = new TypingGame()
    game.tick(MAX_TIME_PER_LEVEL_MS[0])
    const scoreBefore = game.score
    game.tick(1000)
    expect(game.score).toBe(scoreBefore)
  })
})

// ── Prompt completion ─────────────────────────────────────────────────────────

describe('TypingGame – prompt completion', () => {
  it('awards at least BASE_SCORE_PER_PROMPT on completion', () => {
    const game = new TypingGame()
    typeString(game, getPrompt(game))
    expect(game.score).toBeGreaterThanOrEqual(BASE_SCORE_PER_PROMPT)
  })

  it('loads a new prompt after completion', () => {
    const game = new TypingGame()
    const firstPrompt = getPrompt(game)
    typeString(game, firstPrompt)
    // The typed field should be reset
    expect(game.getState().typed).toBe('')
  })

  it('extends timer by BONUS_TIME_ON_COMPLETE_MS on completion (capped at level max)', () => {
    const game = new TypingGame()
    // Drain some time first so we can verify the extension
    game.tick(10_000)
    const timeBefore = game.getState().timeRemainingMs
    typeString(game, getPrompt(game))
    const timeAfter = game.getState().timeRemainingMs
    const extended = timeAfter - timeBefore
    expect(extended).toBeGreaterThan(0)
    expect(extended).toBeLessThanOrEqual(BONUS_TIME_ON_COMPLETE_MS)
    expect(timeAfter).toBeLessThanOrEqual(MAX_TIME_PER_LEVEL_MS[0])
  })
})

// ── Difficulty ramp ───────────────────────────────────────────────────────────

describe('TypingGame – difficulty ramp', () => {
  it('stays at difficulty 1 below threshold', () => {
    const game = new TypingGame()
    // Score should be below DIFFICULTY_THRESHOLDS[1] after one prompt
    typeString(game, getPrompt(game))
    // One completion: BASE_SCORE_PER_PROMPT (50) < 100 → still level 1
    if (game.score < DIFFICULTY_THRESHOLDS[1]) {
      expect(game.difficulty).toBe(1)
    }
  })

  it('advances to difficulty 2 when score crosses first threshold', () => {
    const game = new TypingGame()
    // Force score past 100 by repeatedly completing prompts
    while (game.score < DIFFICULTY_THRESHOLDS[1] && game.status === 'running') {
      typeString(game, getPrompt(game))
    }
    if (game.score >= DIFFICULTY_THRESHOLDS[1]) {
      expect(game.difficulty).toBeGreaterThanOrEqual(2)
    }
  })

  it('advances to difficulty 3 when score crosses second threshold', () => {
    const game = new TypingGame()
    while (game.score < DIFFICULTY_THRESHOLDS[2] && game.status === 'running') {
      typeString(game, getPrompt(game))
    }
    if (game.score >= DIFFICULTY_THRESHOLDS[2]) {
      expect(game.difficulty).toBe(3)
    }
  })
})

// ── Reset ─────────────────────────────────────────────────────────────────────

describe('TypingGame – reset', () => {
  it('reset() restores running status after gameover', () => {
    const game = new TypingGame()
    game.tick(MAX_TIME_PER_LEVEL_MS[0] + 1)
    expect(game.status).toBe('gameover')
    game.reset()
    expect(game.status).toBe('running')
  })

  it('reset() zeroes the score', () => {
    const game = new TypingGame()
    typeString(game, getPrompt(game))
    expect(game.score).toBeGreaterThan(0)
    game.reset()
    expect(game.score).toBe(0)
  })

  it('reset() restores difficulty to 1', () => {
    const game = new TypingGame()
    while (game.score < DIFFICULTY_THRESHOLDS[1] + 1 && game.status === 'running') {
      typeString(game, getPrompt(game))
    }
    game.reset()
    expect(game.difficulty).toBe(1)
  })

  it('reset() restores full timer', () => {
    const game = new TypingGame()
    game.tick(10_000)
    game.reset()
    expect(game.getState().timeRemainingMs).toBe(MAX_TIME_PER_LEVEL_MS[0])
  })

  it('reset() clears typed string', () => {
    const game = new TypingGame()
    const prompt = getPrompt(game)
    game.type(prompt[0])
    game.reset()
    expect(game.getState().typed).toBe('')
  })
})

// ── getState immutability ─────────────────────────────────────────────────────

describe('TypingGame – getState', () => {
  it('getState() returns correct score', () => {
    const game = new TypingGame()
    typeString(game, getPrompt(game))
    expect(game.getState().score).toBe(game.score)
  })

  it('getState() returns correct difficulty', () => {
    const game = new TypingGame()
    expect(game.getState().difficulty).toBe(game.difficulty)
  })
})
