import { describe, it, expect, vi } from 'vitest'
import { StateMachine, GameStatus } from '../stateMachine'

describe('StateMachine', () => {
  it('starts in Idle state', () => {
    const sm = new StateMachine()
    expect(sm.state).toBe(GameStatus.Idle)
  })

  it('transitions Idle → Running', () => {
    const sm = new StateMachine()
    sm.transition(GameStatus.Running)
    expect(sm.state).toBe(GameStatus.Running)
  })

  it('transitions Running → Paused', () => {
    const sm = new StateMachine()
    sm.transition(GameStatus.Running)
    sm.transition(GameStatus.Paused)
    expect(sm.state).toBe(GameStatus.Paused)
  })

  it('transitions Running → GameOver', () => {
    const sm = new StateMachine()
    sm.transition(GameStatus.Running)
    sm.transition(GameStatus.GameOver)
    expect(sm.state).toBe(GameStatus.GameOver)
  })

  it('transitions Paused → Running', () => {
    const sm = new StateMachine()
    sm.transition(GameStatus.Running)
    sm.transition(GameStatus.Paused)
    sm.transition(GameStatus.Running)
    expect(sm.state).toBe(GameStatus.Running)
  })

  it('transitions Paused → Idle', () => {
    const sm = new StateMachine()
    sm.transition(GameStatus.Running)
    sm.transition(GameStatus.Paused)
    sm.transition(GameStatus.Idle)
    expect(sm.state).toBe(GameStatus.Idle)
  })

  it('transitions GameOver → Idle', () => {
    const sm = new StateMachine()
    sm.transition(GameStatus.Running)
    sm.transition(GameStatus.GameOver)
    sm.transition(GameStatus.Idle)
    expect(sm.state).toBe(GameStatus.Idle)
  })

  it('throws on invalid transition', () => {
    const sm = new StateMachine()
    expect(() => sm.transition(GameStatus.GameOver)).toThrow()
  })

  it('throws when transitioning Idle → Paused', () => {
    const sm = new StateMachine()
    expect(() => sm.transition(GameStatus.Paused)).toThrow()
  })

  it('notifies listeners on transition', () => {
    const sm = new StateMachine()
    const cb = vi.fn()
    sm.onStateChange(cb)
    sm.transition(GameStatus.Running)
    expect(cb).toHaveBeenCalledWith(GameStatus.Idle, GameStatus.Running)
  })

  it('removes listener with offStateChange', () => {
    const sm = new StateMachine()
    const cb = vi.fn()
    sm.onStateChange(cb)
    sm.offStateChange(cb)
    sm.transition(GameStatus.Running)
    expect(cb).not.toHaveBeenCalled()
  })
})
