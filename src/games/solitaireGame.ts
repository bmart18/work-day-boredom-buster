// ── Types ────────────────────────────────────────────────────────────────────

export type Suit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades'
export const SUITS: readonly Suit[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades']

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
export const RANKS: readonly Rank[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
]

export const RANK_VALUE: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
}

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export type SolitaireStatus = 'running' | 'won'

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau'

export interface CardLocation {
  pile: PileType
  /** 0–3 for foundation (indexed by SUITS), 0–6 for tableau, 0 for stock/waste. */
  pileIndex: number
  /** Index of the card within the pile array.  -1 signals an empty-pile click. */
  cardIndex: number
}

export interface SolitaireGameState {
  stock: Card[]
  waste: Card[]
  /** Four piles, one per suit, ordered by SUITS. */
  foundation: Card[][]
  /** Seven tableau columns. */
  tableau: Card[][]
  status: SolitaireStatus
  score: number
  moves: number
  selection: CardLocation | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRed(suit: Suit): boolean {
  return suit === 'Hearts' || suit === 'Diamonds'
}

function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false })
    }
  }
  return deck
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── SolitaireGame ─────────────────────────────────────────────────────────────

/**
 * Klondike Solitaire game engine.
 *
 * Rules:
 * - Draw 1 card from stock per click.
 * - When stock is empty, click recycles waste back to stock (−15 score).
 * - Tableau: place a card on a face-up card of the opposite colour and rank+1,
 *   or place a King on an empty column.
 * - Foundation: build up same-suit from Ace to King.
 * - Moving a face-up tableau stack (starting at any face-up card) is allowed.
 * - Double-clicking the top card of waste or tableau auto-moves it to foundation.
 *
 * Scoring:
 * +5  each tableau-to-tableau move
 * +5  each automatic flip of a newly exposed face-down tableau card
 * +10 each card moved to foundation (including auto-move)
 * −15 recycling waste back to stock
 * +100 winning the game
 */
export class SolitaireGame {
  private _stock: Card[] = []
  private _waste: Card[] = []
  private _foundation: Card[][] = [[], [], [], []]
  private _tableau: Card[][] = [[], [], [], [], [], [], []]
  private _status: SolitaireStatus = 'running'
  private _score = 0
  private _moves = 0
  private _selection: CardLocation | null = null

  constructor() {
    this.deal()
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  get status(): SolitaireStatus { return this._status }
  get score(): number { return this._score }
  get moves(): number { return this._moves }

  /** Returns an immutable snapshot of the game state for rendering. */
  getState(): SolitaireGameState {
    return {
      stock: this._stock.map(c => ({ ...c })),
      waste: this._waste.map(c => ({ ...c })),
      foundation: this._foundation.map(p => p.map(c => ({ ...c }))),
      tableau: this._tableau.map(col => col.map(c => ({ ...c }))),
      status: this._status,
      score: this._score,
      moves: this._moves,
      selection: this._selection ? { ...this._selection } : null,
    }
  }

  /** Resets the game to a fresh shuffled deal. */
  reset(): void {
    this._stock = []
    this._waste = []
    this._foundation = [[], [], [], []]
    this._tableau = [[], [], [], [], [], [], []]
    this._status = 'running'
    this._score = 0
    this._moves = 0
    this._selection = null
    this.deal()
  }

  // ── Input handlers ─────────────────────────────────────────────────────────

  /**
   * Handle a click anywhere on the board.
   *
   * @param pile      - Pile type that was clicked.
   * @param pileIndex - Which pile within that type.
   * @param cardIndex - Index of card in the pile array; −1 means empty-pile.
   */
  click(pile: PileType, pileIndex: number, cardIndex: number): void {
    if (this._status === 'won') return

    if (pile === 'stock') {
      this.handleStockClick()
      return
    }

    const pileArr = this.getPileArray(pile, pileIndex)

    // Empty-pile click while carrying a selection → try to place
    if (cardIndex < 0 || pileArr.length === 0) {
      if (this._selection) this.tryMove(pile, pileIndex)
      return
    }

    const card = pileArr[cardIndex]
    if (!card) return

    // A selection is active → try to move it to this pile
    if (this._selection) {
      const s = this._selection
      if (s.pile === pile && s.pileIndex === pileIndex && s.cardIndex === cardIndex) {
        // Clicking same card → deselect
        this._selection = null
        return
      }
      const moved = this.tryMove(pile, pileIndex)
      if (!moved) {
        // Move failed → try selecting the clicked card instead
        if (this.isSelectable(card, pile, pileArr, cardIndex)) {
          this._selection = { pile, pileIndex, cardIndex }
        } else {
          this._selection = null
        }
      }
      return
    }

    // No active selection → try to select the clicked card
    if (this.isSelectable(card, pile, pileArr, cardIndex)) {
      this._selection = { pile, pileIndex, cardIndex }
    }
  }

  /**
   * Double-click: auto-move the top card of a waste or tableau pile to its
   * matching foundation pile, if the move is valid.
   */
  doubleClick(pile: PileType, pileIndex: number): void {
    if (this._status === 'won') return

    let sourcePile: Card[]
    let cardIdx: number

    if (pile === 'waste') {
      sourcePile = this._waste
      cardIdx = this._waste.length - 1
    } else if (pile === 'tableau') {
      sourcePile = this._tableau[pileIndex]
      cardIdx = sourcePile.length - 1
    } else {
      return
    }

    if (cardIdx < 0) return
    const card = sourcePile[cardIdx]
    if (!card?.faceUp) return

    const foundIdx = SUITS.indexOf(card.suit)
    const foundPile = this._foundation[foundIdx]

    if (this.canPlaceOnFoundation(card, foundPile)) {
      sourcePile.splice(cardIdx, 1)
      foundPile.push(card)
      this._score += 10
      this._moves++
      this._selection = null
      if (pile === 'tableau') this.flipTopCard(pileIndex)
      this.checkWin()
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private handleStockClick(): void {
    this._selection = null
    if (this._stock.length > 0) {
      const card = this._stock.pop()!
      card.faceUp = true
      this._waste.push(card)
      this._moves++
    } else {
      // Recycle waste back to stock
      this._stock = [...this._waste].reverse().map(c => ({ ...c, faceUp: false }))
      this._waste = []
      this._score = Math.max(0, this._score - 15)
      this._moves++
    }
  }

  private tryMove(toPile: PileType, toPileIndex: number): boolean {
    if (!this._selection) return false
    const sel = this._selection
    const sourcePile = this.getPileArray(sel.pile, sel.pileIndex)
    const movingCards = sourcePile.slice(sel.cardIndex)
    if (movingCards.length === 0) return false
    const leadCard = movingCards[0]

    if (toPile === 'foundation') {
      // Only single-card moves to foundation
      if (movingCards.length !== 1) return false
      const destPile = this._foundation[toPileIndex]
      if (!this.canPlaceOnFoundation(leadCard, destPile)) return false
      sourcePile.splice(sel.cardIndex, movingCards.length)
      destPile.push(leadCard)
      this._score += 10
      this._moves++
      this._selection = null
      if (sel.pile === 'tableau') this.flipTopCard(sel.pileIndex)
      this.checkWin()
      return true
    }

    if (toPile === 'tableau') {
      const destCol = this._tableau[toPileIndex]
      const destTop = destCol.length > 0 ? destCol[destCol.length - 1] : null
      if (!this.canPlaceOnTableau(leadCard, destTop)) return false
      sourcePile.splice(sel.cardIndex, movingCards.length)
      destCol.push(...movingCards)
      this._score += 5
      this._moves++
      this._selection = null
      if (sel.pile === 'tableau') this.flipTopCard(sel.pileIndex)
      return true
    }

    return false
  }

  private isSelectable(
    card: Card,
    pile: PileType,
    pileArr: Card[],
    cardIndex: number,
  ): boolean {
    if (!card.faceUp) return false
    // Waste and foundation: only the top card
    if (pile === 'waste' && cardIndex !== pileArr.length - 1) return false
    if (pile === 'foundation' && cardIndex !== pileArr.length - 1) return false
    return true
  }

  private canPlaceOnFoundation(card: Card, pile: Card[]): boolean {
    if (pile.length === 0) return card.rank === 'A'
    const top = pile[pile.length - 1]
    return top.suit === card.suit && RANK_VALUE[top.rank] + 1 === RANK_VALUE[card.rank]
  }

  private canPlaceOnTableau(card: Card, top: Card | null): boolean {
    if (top === null) return card.rank === 'K'
    return (
      top.faceUp &&
      isRed(top.suit) !== isRed(card.suit) &&
      RANK_VALUE[top.rank] - 1 === RANK_VALUE[card.rank]
    )
  }

  /** Flips the newly exposed top card of a tableau column face-up, awarding points. */
  private flipTopCard(tableauIndex: number): void {
    const col = this._tableau[tableauIndex]
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true
      this._score += 5
    }
  }

  private getPileArray(pile: PileType, pileIndex: number): Card[] {
    switch (pile) {
      case 'stock':      return this._stock
      case 'waste':      return this._waste
      case 'foundation': return this._foundation[pileIndex]
      case 'tableau':    return this._tableau[pileIndex]
    }
  }

  private deal(): void {
    const deck = shuffle(createDeck())
    let idx = 0
    // Column i gets i+1 cards; only the last card in each column starts face-up
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[idx++]
        card.faceUp = row === col
        this._tableau[col].push(card)
      }
    }
    // Remaining 24 cards go to the stock pile
    this._stock = deck.slice(idx)
  }

  private checkWin(): void {
    if (this._foundation.every(p => p.length === 13)) {
      this._status = 'won'
      this._score += 100
    }
  }
}
