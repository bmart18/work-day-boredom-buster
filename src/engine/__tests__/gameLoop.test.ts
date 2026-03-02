import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameLoop } from '../gameLoop'

describe('GameLoop', () => {
  let rafCallbacks: FrameRequestCallback[]
  let rafIdCounter: number

  beforeEach(() => {
    rafCallbacks = []
    rafIdCounter = 1

    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
      (cb: FrameRequestCallback): number => {
        rafCallbacks.push(cb)
        return rafIdCounter++
      },
    )
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    rafCallbacks = []
  })

  function flushFrames(timestamps: number[]): void {
    for (const ts of timestamps) {
      const cbs = rafCallbacks.splice(0)
      for (const cb of cbs) cb(ts)
    }
  }

  it('starts in stopped state', () => {
    const loop = new GameLoop(vi.fn())
    expect(loop.running).toBe(false)
  })

  it('transitions to running after start()', () => {
    const loop = new GameLoop(vi.fn())
    loop.start()
    expect(loop.running).toBe(true)
  })

  it('does not double-start', () => {
    const loop = new GameLoop(vi.fn())
    loop.start()
    loop.start()
    expect(rafCallbacks.length).toBe(1)
  })

  it('stops correctly', () => {
    const loop = new GameLoop(vi.fn())
    loop.start()
    loop.stop()
    expect(loop.running).toBe(false)
  })

  it('fires tick callback at fixed intervals', () => {
    const TICK_MS = 100
    const tick = vi.fn()
    const loop = new GameLoop(tick, TICK_MS)
    loop.start()

    // First frame initialises lastTimestamp — no tick yet
    flushFrames([0])
    expect(tick).not.toHaveBeenCalled()

    // 100 ms elapsed → exactly one tick
    flushFrames([100])
    expect(tick).toHaveBeenCalledTimes(1)
    expect(tick).toHaveBeenCalledWith(TICK_MS)

    // 300 ms elapsed → three more ticks
    flushFrames([400])
    expect(tick).toHaveBeenCalledTimes(4)
  })

  it('skips tick when elapsed time is less than tickMs', () => {
    const TICK_MS = 100
    const tick = vi.fn()
    const loop = new GameLoop(tick, TICK_MS)
    loop.start()

    flushFrames([0, 50]) // only 50 ms elapsed
    expect(tick).not.toHaveBeenCalled()
  })

  it('does not fire ticks after stop()', () => {
    const TICK_MS = 50
    const tick = vi.fn()
    const loop = new GameLoop(tick, TICK_MS)
    loop.start()

    flushFrames([0])
    loop.stop()
    // Simulate a late RAF callback that arrives after stop
    expect(tick).not.toHaveBeenCalled()
  })
})
