import { describe, it, expect } from 'vitest'
import { ScoreSystem } from '../scoreSystem'

describe('ScoreSystem', () => {
  it('starts at zero score', () => {
    const ss = new ScoreSystem()
    expect(ss.score).toBe(0)
  })

  it('starts at zero high score', () => {
    const ss = new ScoreSystem()
    expect(ss.highScore).toBe(0)
  })

  it('adds points correctly', () => {
    const ss = new ScoreSystem()
    ss.add(10)
    ss.add(5)
    expect(ss.score).toBe(15)
  })

  it('updates high score when current score exceeds it', () => {
    const ss = new ScoreSystem()
    ss.add(100)
    expect(ss.highScore).toBe(100)
  })

  it('preserves high score after reset()', () => {
    const ss = new ScoreSystem()
    ss.add(50)
    ss.reset()
    expect(ss.score).toBe(0)
    expect(ss.highScore).toBe(50)
  })

  it('sets high score to new run if it beats previous', () => {
    const ss = new ScoreSystem()
    ss.add(50)
    ss.reset()
    ss.add(80)
    expect(ss.highScore).toBe(80)
  })

  it('retains old high score if new run is lower', () => {
    const ss = new ScoreSystem()
    ss.add(100)
    ss.reset()
    ss.add(40)
    expect(ss.highScore).toBe(100)
  })

  it('resets both score and high score with resetAll()', () => {
    const ss = new ScoreSystem()
    ss.add(200)
    ss.resetAll()
    expect(ss.score).toBe(0)
    expect(ss.highScore).toBe(0)
  })

  it('throws when adding negative points', () => {
    const ss = new ScoreSystem()
    expect(() => ss.add(-1)).toThrow()
  })
})
