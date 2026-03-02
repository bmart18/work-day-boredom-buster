import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InputRouter, GameInput } from '../inputRouter'

describe('InputRouter', () => {
  let router: InputRouter

  beforeEach(() => {
    router = new InputRouter()
  })

  afterEach(() => {
    router.unbind()
  })

  function fireKey(key: string): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }))
  }

  it('routes ArrowUp to GameInput.Up', () => {
    const handler = vi.fn()
    router.bind(handler)
    fireKey('ArrowUp')
    expect(handler).toHaveBeenCalledWith(GameInput.Up)
  })

  it('routes ArrowDown to GameInput.Down', () => {
    const handler = vi.fn()
    router.bind(handler)
    fireKey('ArrowDown')
    expect(handler).toHaveBeenCalledWith(GameInput.Down)
  })

  it('routes ArrowLeft to GameInput.Left', () => {
    const handler = vi.fn()
    router.bind(handler)
    fireKey('ArrowLeft')
    expect(handler).toHaveBeenCalledWith(GameInput.Left)
  })

  it('routes ArrowRight to GameInput.Right', () => {
    const handler = vi.fn()
    router.bind(handler)
    fireKey('ArrowRight')
    expect(handler).toHaveBeenCalledWith(GameInput.Right)
  })

  it('routes Enter to GameInput.Confirm', () => {
    const handler = vi.fn()
    router.bind(handler)
    fireKey('Enter')
    expect(handler).toHaveBeenCalledWith(GameInput.Confirm)
  })

  it('routes Escape to GameInput.Escape', () => {
    const handler = vi.fn()
    router.bind(handler)
    fireKey('Escape')
    expect(handler).toHaveBeenCalledWith(GameInput.Escape)
  })

  it('routes printable characters to GameInput.TypeCharacter with the char', () => {
    const handler = vi.fn()
    router.bind(handler)
    fireKey('a')
    expect(handler).toHaveBeenCalledWith(GameInput.TypeCharacter, 'a')
  })

  it('does not fire after unbind()', () => {
    const handler = vi.fn()
    router.bind(handler)
    router.unbind()
    fireKey('Escape')
    expect(handler).not.toHaveBeenCalled()
  })

  it('replaces previous handler on re-bind', () => {
    const first = vi.fn()
    const second = vi.fn()
    router.bind(first)
    router.bind(second)
    fireKey('Enter')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(GameInput.Confirm)
  })
})
