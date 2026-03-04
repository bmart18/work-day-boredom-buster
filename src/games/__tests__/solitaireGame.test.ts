import { describe, it, expect } from 'vitest'
import {
  SolitaireGame,
  SUITS,
  RANKS,
  RANK_VALUE,
  type Card,
  type Suit,
  type Rank,
} from '../solitaireGame'

// ── Helpers ───────────────────────────────────────────────────────────────────

function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { suit, rank, faceUp }
}

/** Read-only access to private fields via type cast. */
function priv(game: SolitaireGame): {
  _stock: Card[]
  _waste: Card[]
  _foundation: Card[][]
  _tableau: Card[][]
} {
  return game as unknown as {
    _stock: Card[]
    _waste: Card[]
    _foundation: Card[][]
    _tableau: Card[][]
  }
}

// ── Initial state ─────────────────────────────────────────────────────────────

describe('SolitaireGame – initial state', () => {
  it('starts with status "running"', () => {
    const game = new SolitaireGame()
    expect(game.status).toBe('running')
  })

  it('starts with zero score', () => {
    const game = new SolitaireGame()
    expect(game.score).toBe(0)
  })

  it('starts with zero moves', () => {
    const game = new SolitaireGame()
    expect(game.moves).toBe(0)
  })

  it('deals 7 tableau columns of increasing length (1–7)', () => {
    const game = new SolitaireGame()
    const { tableau } = game.getState()
    for (let col = 0; col < 7; col++) {
      expect(tableau[col].length).toBe(col + 1)
    }
  })

  it('each tableau column has exactly one face-up card (the last)', () => {
    const game = new SolitaireGame()
    const { tableau } = game.getState()
    for (const col of tableau) {
      const faceUpCount = col.filter(c => c.faceUp).length
      expect(faceUpCount).toBe(1)
      expect(col[col.length - 1].faceUp).toBe(true)
    }
  })

  it('stock holds exactly 24 cards after deal', () => {
    const game = new SolitaireGame()
    const { stock } = game.getState()
    expect(stock.length).toBe(24)
  })

  it('starts with empty waste', () => {
    const game = new SolitaireGame()
    expect(game.getState().waste.length).toBe(0)
  })

  it('starts with empty foundation piles', () => {
    const game = new SolitaireGame()
    for (const pile of game.getState().foundation) {
      expect(pile.length).toBe(0)
    }
  })

  it('starts with no selection', () => {
    const game = new SolitaireGame()
    expect(game.getState().selection).toBeNull()
  })

  it('deck has 52 unique cards across stock + tableau', () => {
    const game = new SolitaireGame()
    const state = game.getState()
    const all = [
      ...state.stock,
      ...state.waste,
      ...state.foundation.flat(),
      ...state.tableau.flat(),
    ]
    expect(all.length).toBe(52)
    const unique = new Set(all.map(c => `${c.suit}-${c.rank}`))
    expect(unique.size).toBe(52)
  })
})

// ── Stock & waste ─────────────────────────────────────────────────────────────

describe('SolitaireGame – stock & waste', () => {
  it('clicking stock moves one card to waste', () => {
    const game = new SolitaireGame()
    const before = game.getState().stock.length
    game.click('stock', 0, 0)
    const state = game.getState()
    expect(state.stock.length).toBe(before - 1)
    expect(state.waste.length).toBe(1)
  })

  it('card moved to waste is face-up', () => {
    const game = new SolitaireGame()
    game.click('stock', 0, 0)
    const { waste } = game.getState()
    expect(waste[waste.length - 1].faceUp).toBe(true)
  })

  it('clicking empty stock recycles waste back to stock', () => {
    const game = new SolitaireGame()
    // Drain entire stock
    const stockSize = game.getState().stock.length
    for (let i = 0; i < stockSize; i++) game.click('stock', 0, 0)
    expect(game.getState().stock.length).toBe(0)
    expect(game.getState().waste.length).toBe(stockSize)
    // Recycle
    game.click('stock', 0, 0)
    expect(game.getState().waste.length).toBe(0)
    expect(game.getState().stock.length).toBe(stockSize)
  })

  it('recycling waste incurs a score penalty', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    // Seed a positive score so the −15 penalty is observable after clamping
    ;(game as unknown as { _score: number })._score = 20
    // Drain entire stock so recycling is triggered on next click
    const stockSize = game.getState().stock.length
    for (let i = 0; i < stockSize; i++) game.click('stock', 0, 0)
    const scoreBefore = game.score
    game.click('stock', 0, 0) // recycle
    expect(game.score).toBeLessThan(scoreBefore)
    void p // keep p used
  })

  it('score never goes below zero from recycling', () => {
    const game = new SolitaireGame()
    const stockSize = game.getState().stock.length
    for (let i = 0; i < stockSize; i++) game.click('stock', 0, 0)
    game.click('stock', 0, 0)
    expect(game.score).toBeGreaterThanOrEqual(0)
  })
})

// ── Selection ─────────────────────────────────────────────────────────────────

describe('SolitaireGame – selection', () => {
  it('clicking a face-up waste card selects it', () => {
    const game = new SolitaireGame()
    game.click('stock', 0, 0)
    const { waste } = game.getState()
    const topIdx = waste.length - 1
    game.click('waste', 0, topIdx)
    expect(game.getState().selection).toMatchObject({
      pile: 'waste', pileIndex: 0, cardIndex: topIdx,
    })
  })

  it('clicking the same card again deselects it', () => {
    const game = new SolitaireGame()
    game.click('stock', 0, 0)
    const topIdx = game.getState().waste.length - 1
    game.click('waste', 0, topIdx)
    game.click('waste', 0, topIdx)
    expect(game.getState().selection).toBeNull()
  })

  it('clicking stock while something is selected clears the selection', () => {
    const game = new SolitaireGame()
    game.click('stock', 0, 0)
    game.click('waste', 0, 0)
    game.click('stock', 0, 0)
    expect(game.getState().selection).toBeNull()
  })
})

// ── Foundation moves ──────────────────────────────────────────────────────────

describe('SolitaireGame – foundation moves', () => {
  it('can move an Ace to the matching empty foundation pile', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    // Clear tableau and waste; put an Ace of Hearts in waste
    p._tableau = [[], [], [], [], [], [], []]
    p._waste = [card('Hearts', 'A')]
    p._stock = []

    game.click('waste', 0, 0) // select Ace of Hearts
    game.click('foundation', SUITS.indexOf('Hearts'), -1) // place on foundation

    expect(game.getState().foundation[SUITS.indexOf('Hearts')].length).toBe(1)
    expect(game.score).toBe(10)
  })

  it('cannot move a non-Ace to an empty foundation pile', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [[], [], [], [], [], [], []]
    p._waste = [card('Hearts', '2')]
    p._stock = []

    game.click('waste', 0, 0)
    game.click('foundation', SUITS.indexOf('Hearts'), -1)

    expect(game.getState().foundation[SUITS.indexOf('Hearts')].length).toBe(0)
  })

  it('builds foundation in sequence: A → 2 → 3', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [[], [], [], [], [], [], []]
    p._stock = []
    const fi = SUITS.indexOf('Spades')

    p._waste = [card('Spades', 'A')]
    game.click('waste', 0, 0)
    game.click('foundation', fi, -1)

    p._waste = [card('Spades', '2')]
    game.click('waste', 0, 0)
    game.click('foundation', fi, 0)

    p._waste = [card('Spades', '3')]
    game.click('waste', 0, 0)
    game.click('foundation', fi, 1)

    expect(game.getState().foundation[fi].map(c => c.rank)).toEqual(['A', '2', '3'])
  })
})

// ── Tableau moves ─────────────────────────────────────────────────────────────

describe('SolitaireGame – tableau moves', () => {
  it('can place a red card on a black card of rank+1', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    // Column 0: black 5, face-up; Column 1: red 4, face-up
    p._tableau = [
      [card('Spades', '5')],
      [card('Hearts', '4')],
      [], [], [], [], [],
    ]
    p._waste = []
    p._stock = []

    game.click('tableau', 1, 0) // select red 4
    game.click('tableau', 0, 0) // place on black 5

    const state = game.getState()
    expect(state.tableau[0].length).toBe(2)
    expect(state.tableau[1].length).toBe(0)
  })

  it('cannot place a card of the same colour on another', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [
      [card('Spades', '5')],
      [card('Clubs', '4')],
      [], [], [], [], [],
    ]
    p._waste = []
    p._stock = []

    game.click('tableau', 1, 0)
    game.click('tableau', 0, 0)

    expect(game.getState().tableau[0].length).toBe(1) // unchanged
  })

  it('can move a King to an empty tableau column', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [
      [],
      [card('Hearts', 'K')],
      [], [], [], [], [],
    ]
    p._waste = []
    p._stock = []

    game.click('tableau', 1, 0)
    game.click('tableau', 0, -1)

    expect(game.getState().tableau[0].length).toBe(1)
    expect(game.getState().tableau[1].length).toBe(0)
  })

  it('cannot place a non-King on an empty column', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [
      [],
      [card('Hearts', 'Q')],
      [], [], [], [], [],
    ]
    p._waste = []
    p._stock = []

    game.click('tableau', 1, 0)
    game.click('tableau', 0, -1)

    expect(game.getState().tableau[0].length).toBe(0)
  })

  it('moves a stack of face-up cards together', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    // Column 0: black 7; Column 1: red 6, black 5 (both face-up)
    p._tableau = [
      [card('Spades', '7')],
      [card('Hearts', '6'), card('Clubs', '5')],
      [], [], [], [], [],
    ]
    p._waste = []
    p._stock = []

    game.click('tableau', 1, 0) // select red 6 (bottom of face-up stack)
    game.click('tableau', 0, 0) // place on black 7

    const state = game.getState()
    expect(state.tableau[0].length).toBe(3)
    expect(state.tableau[1].length).toBe(0)
  })

  it('flips the top face-down tableau card after a card is moved away', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    // Column 0: face-down 8 then face-up red 7
    p._tableau = [
      [card('Spades', '8', false), card('Hearts', '7')],
      [card('Clubs', '6')],  // will receive the stack
      [], [], [], [], [],
    ]
    p._waste = []
    p._stock = []

    // Move red 7 onto ... wait, 7 can't go on 6 (needs 8). Let me adjust.
    // column 1: black 8
    p._tableau[1] = [card('Clubs', '8')]

    // Move red 7 (col 0, idx 1) onto black 8 (col 1, idx 0)
    game.click('tableau', 0, 1) // select red 7
    game.click('tableau', 1, 0) // place on black 8

    expect(game.getState().tableau[0][0].faceUp).toBe(true)
  })
})

// ── Double-click auto-move ────────────────────────────────────────────────────

describe('SolitaireGame – doubleClick auto-move', () => {
  it('double-click moves Ace from waste to foundation', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [[], [], [], [], [], [], []]
    p._waste = [card('Diamonds', 'A')]
    p._stock = []

    game.doubleClick('waste', 0)

    const fi = SUITS.indexOf('Diamonds')
    expect(game.getState().foundation[fi].length).toBe(1)
    expect(game.getState().waste.length).toBe(0)
  })

  it('double-click does nothing when move is invalid', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [[], [], [], [], [], [], []]
    p._waste = [card('Diamonds', '5')]
    p._stock = []
    const fi = SUITS.indexOf('Diamonds')

    game.doubleClick('waste', 0)
    expect(game.getState().foundation[fi].length).toBe(0)
    expect(game.getState().waste.length).toBe(1)
  })

  it('double-click moves a tableau card to foundation', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [[card('Clubs', 'A')], [], [], [], [], [], []]
    p._waste = []
    p._stock = []
    const fi = SUITS.indexOf('Clubs')

    game.doubleClick('tableau', 0)

    expect(game.getState().foundation[fi].length).toBe(1)
    expect(game.getState().tableau[0].length).toBe(0)
  })
})

// ── Win condition ─────────────────────────────────────────────────────────────

describe('SolitaireGame – win condition', () => {
  it('status becomes "won" when all four foundations have 13 cards', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [[], [], [], [], [], [], []]
    p._waste = []
    p._stock = []

    // Fill first three foundations to 13
    for (let fi = 0; fi < 3; fi++) {
      p._foundation[fi] = RANKS.map(r => card(SUITS[fi], r))
    }

    // Fill last foundation up to Queen
    const lastSuit = SUITS[3]
    const fi = 3
    p._foundation[fi] = RANKS.slice(0, 12).map(r => card(lastSuit, r))

    // Put King on waste and move to foundation
    p._waste = [card(lastSuit, 'K')]
    game.click('waste', 0, 0)
    game.click('foundation', fi, p._foundation[fi].length - 1)

    expect(game.status).toBe('won')
  })

  it('win bonus of 100 is added to score on win', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [[], [], [], [], [], [], []]
    p._waste = []
    p._stock = []

    for (let fi = 0; fi < 3; fi++) {
      p._foundation[fi] = RANKS.map(r => card(SUITS[fi], r))
    }
    const lastSuit = SUITS[3]
    p._foundation[3] = RANKS.slice(0, 12).map(r => card(lastSuit, r))
    p._waste = [card(lastSuit, 'K')]

    const scoreBefore = game.score
    game.click('waste', 0, 0)
    game.click('foundation', 3, p._foundation[3].length - 1)

    expect(game.score).toBe(scoreBefore + 10 + 100)
  })

  it('no further moves accepted after win', () => {
    const game = new SolitaireGame()
    const p = priv(game)
    p._tableau = [[], [], [], [], [], [], []]
    p._waste = []
    p._stock = []

    for (let fi = 0; fi < 4; fi++) {
      p._foundation[fi] = RANKS.map(r => card(SUITS[fi], r))
    }

    // Artificially force win state by moving last card
    ;(game as unknown as { _status: string })._status = 'won'

    const movesBefore = game.moves
    game.click('stock', 0, 0)
    expect(game.moves).toBe(movesBefore)
  })
})

// ── reset() ───────────────────────────────────────────────────────────────────

describe('SolitaireGame – reset()', () => {
  it('restores running status', () => {
    const game = new SolitaireGame()
    ;(game as unknown as { _status: string })._status = 'won'
    game.reset()
    expect(game.status).toBe('running')
  })

  it('zeroes score and moves', () => {
    const game = new SolitaireGame()
    game.click('stock', 0, 0)
    game.reset()
    expect(game.score).toBe(0)
    expect(game.moves).toBe(0)
  })

  it('clears selection', () => {
    const game = new SolitaireGame()
    game.click('stock', 0, 0)
    const topIdx = game.getState().waste.length - 1
    game.click('waste', 0, topIdx)
    game.reset()
    expect(game.getState().selection).toBeNull()
  })

  it('deals a fresh 52-card game', () => {
    const game = new SolitaireGame()
    game.reset()
    const state = game.getState()
    const all = [
      ...state.stock,
      ...state.waste,
      ...state.foundation.flat(),
      ...state.tableau.flat(),
    ]
    expect(all.length).toBe(52)
  })
})

// ── RANK_VALUE / SUITS / RANKS exports ────────────────────────────────────────

describe('exports', () => {
  it('RANK_VALUE maps all 13 ranks', () => {
    expect(Object.keys(RANK_VALUE).length).toBe(13)
    expect(RANK_VALUE['A']).toBe(1)
    expect(RANK_VALUE['K']).toBe(13)
  })

  it('SUITS has 4 entries', () => {
    expect(SUITS.length).toBe(4)
  })

  it('RANKS has 13 entries', () => {
    expect(RANKS.length).toBe(13)
  })
})
