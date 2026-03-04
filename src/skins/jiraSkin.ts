import type { Skin, GameState } from './Skin'
import type { InputEventHandler } from '../engine/inputRouter'
import type { SolitaireGameState, Card, PileType } from '../games/solitaireGame'
import { SUITS, RANKS, RANK_VALUE } from '../games/solitaireGame'

// ── Constants ─────────────────────────────────────────────────────────────────

const STYLE_ID = 'jira-skin-styles'

const SUIT_CODE: Record<string, string> = {
  Hearts: 'HRT', Diamonds: 'DMD', Clubs: 'CLB', Spades: 'SPD',
}
const RANK_CODE: Record<string, string> = {
  'A': 'ACE', '2': '002', '3': '003', '4': '004', '5': '005',
  '6': '006', '7': '007', '8': '008', '9': '009', '10': '010',
  'J': 'JACK', 'Q': 'QUEEN', 'K': 'KING',
}

const SUIT_SYMBOL: Record<string, string> = {
  Hearts: '♥', Diamonds: '♦', Clubs: '♣', Spades: '♠',
}

/**
 * Red for Hearts/Diamonds (red suits), dark navy for Clubs/Spades (black suits).
 * This colour is used for the indicator badge – the only hint of the card's
 * true identity.
 */
const INDICATOR_COLOUR: Record<string, string> = {
  Hearts:   '#DE350B',
  Diamonds: '#DE350B',
  Clubs:    '#172B4D',
  Spades:   '#172B4D',
}

/** Suit colour used for foundation labels and empty-slot icons. */
const SUIT_COLOUR: Record<string, string> = {
  Hearts: '#DE350B', Diamonds: '#DE350B', Clubs: '#253858', Spades: '#253858',
}

/** Atlassian-style issue type per suit — drives the small icon + label. */
const ISSUE_TYPE: Record<string, { label: string; colour: string; icon: string }> = {
  Hearts:   { label: 'Story', colour: '#0052CC', icon: '◆' },
  Diamonds: { label: 'Bug',   colour: '#DE350B', icon: '●' },
  Clubs:    { label: 'Task',  colour: '#00875A', icon: '✓' },
  Spades:   { label: 'Epic',  colour: '#6554C0', icon: '⚡' },
}

const COLUMN_NAMES = [
  'Backlog', 'To Do', 'In Progress', 'Code Review', 'QA Testing', 'Staging', 'Done',
]

// ── Card metadata helpers ─────────────────────────────────────────────────────

/**
 * Returns the identifier badge that appears in place of the Jira issue number,
 * e.g. "HRT-KING" (King of Hearts) or "SPD-004" (4 of Spades).
 * Coloured red for red suits, dark for black suits.
 */
export function cardIndicator(card: Card): string {
  return `${SUIT_CODE[card.suit]}-${RANK_CODE[card.rank]}`
}

const RANK_ACTIONS: Record<string, string> = {
  'A': 'Initialize', '2': 'Create',    '3': 'Add',      '4': 'Implement',
  '5': 'Update',     '6': 'Fix',       '7': 'Refactor', '8': 'Optimize',
  '9': 'Debug',      '10': 'Test',     'J': 'Review',   'Q': 'Design', 'K': 'Deploy',
}

const SUIT_DOMAINS: Record<string, readonly string[]> = {
  Hearts:   ['login flow', 'user profile UI', 'nav component', 'form validation',
              'modal dialog', 'dashboard layout', 'data table', 'search bar',
              'notification bell', 'sidebar menu', 'tooltip system', 'theme colors', 'responsive grid'],
  Diamonds: ['auth endpoint', 'user service', 'payment API', 'email handler',
              'webhook relay', 'rate limiter', 'token refresh', 'cache layer',
              'queue worker', 'session store', 'file upload', 'batch job', 'event stream'],
  Clubs:    ['build pipeline', 'deploy workflow', 'container image', 'health check',
              'log aggregator', 'alert rules', 'load balancer', 'SSL certs',
              'backup job', 'CDN config', 'secrets vault', 'network policy', 'resource limits'],
  Spades:   ['user table index', 'query optimizer', 'data migration', 'report generator',
              'analytics event', 'audit log', 'data retention', 'schema update',
              'ETL pipeline', 'aggregation job', 'data export', 'backup restore', 'partition pruning'],
}

function cardTitle(card: Card): string {
  const action = RANK_ACTIONS[card.rank] ?? 'Update'
  const domains = SUIT_DOMAINS[card.suit] ?? ['component']
  const idx = RANKS.indexOf(card.rank as never)
  return `${action} ${domains[idx % domains.length]}`
}

function storyPoints(card: Card): number {
  const v = RANK_VALUE[card.rank] ?? 1
  if (v <= 2) return 1
  if (v <= 4) return 2
  if (v <= 6) return 3
  if (v <= 8) return 5
  if (v <= 10) return 8
  return 13
}

const ASSIGNEES = ['JD', 'SM', 'AB', 'KL', 'PR', 'TW', 'MN', 'RF', 'CL', 'EP', 'BW', 'VK', 'GH']
const AVATAR_BG = [
  '#0052CC', '#00875A', '#DE350B', '#6554C0',
  '#FF8B00', '#00A3BF', '#344563', '#97A0AF',
  '#403294', '#5E6C84', '#006644', '#FF5630', '#FFAB00',
]

function assigneeOf(card: Card): { init: string; bg: string } {
  const idx = (SUITS.indexOf(card.suit as never) * 13 + RANKS.indexOf(card.rank as never)) % ASSIGNEES.length
  return { init: ASSIGNEES[idx], bg: AVATAR_BG[idx % AVATAR_BG.length] }
}

// ── HTML builders ─────────────────────────────────────────────────────────────

/**
 * Renders a face-up card as a slim Jira ticket.
 *
 * The indicator (e.g. "SPD-004") appears exactly where a Jira issue number
 * like "RTM-3422" would sit — coloured red for ♥/♦, dark navy for ♣/♠.
 * The card is intentionally compact (slim height) so columns stay tidy.
 */
function renderCardFace(card: Card, selected: boolean, compact: boolean): string {
  const indicator = cardIndicator(card)
  const indColour = INDICATOR_COLOUR[card.suit]
  const title     = cardTitle(card)
  const points    = storyPoints(card)
  const { init, bg } = assigneeOf(card)
  const issue     = ISSUE_TYPE[card.suit]
  const selClass  = selected ? ' jira-card--selected' : ''
  const compClass = compact  ? ' jira-card--compact'  : ''

  return `
    <div class="jira-card jira-card--face${selClass}${compClass}">
      <div class="jira-card__top-row">
        <span class="jira-card__issue-type" style="color:${issue.colour}"
          >${issue.icon} ${issue.label}</span>
        <span class="jira-card__indicator" style="color:${indColour}"
          >${indicator}</span>
      </div>
      <div class="jira-card__title">${title}</div>
      <div class="jira-card__bottom-row">
        <span class="jira-card__avatar" style="background:${bg}">${init}</span>
        <span class="jira-card__points">${points} sp</span>
      </div>
    </div>
  `
}

/**
 * Renders a face-down card as an unrevealed Jira ticket.
 * The real issue type, title, assignee and story points are shown exactly as
 * on a face-up card, but the indicator shows "WORK-?????" (not the real
 * suit/rank code) so the card's identity stays hidden until it is flipped.
 */
function renderCardBack(card: Card): string {
  const title  = cardTitle(card)
  const points = storyPoints(card)
  const { init, bg } = assigneeOf(card)
  const issue  = ISSUE_TYPE[card.suit]

  return `
    <div class="jira-card jira-card--face jira-card--hidden">
      <div class="jira-card__top-row">
        <span class="jira-card__issue-type" style="color:${issue.colour}"
          >${issue.icon} ${issue.label}</span>
        <span class="jira-card__indicator jira-card__indicator--hidden">WORK-?????</span>
      </div>
      <div class="jira-card__title">${title}</div>
      <div class="jira-card__bottom-row">
        <span class="jira-card__avatar" style="background:${bg}">${init}</span>
        <span class="jira-card__points">${points} sp</span>
      </div>
    </div>
  `
}

function renderEmptySlot(label: string, extraStyle = ''): string {
  return `<div class="jira-empty-slot" style="${extraStyle}">${label}</div>`
}

// ── JiraSkin ──────────────────────────────────────────────────────────────────

/**
 * JiraSkin renders Klondike Solitaire as a Jira Kanban board.
 *
 * Visual rules:
 *  • Every card — face-up or face-down — looks like a Jira issue ticket.
 *  • Face-up cards show the real indicator (e.g. "SPD-004" / "HRT-KING")
 *    where the issue number normally appears; red for ♥/♦, dark for ♣/♠.
 *  • Face-down cards show "WORK-?????" and greyed-out placeholder content,
 *    so the board is indistinguishable from a real sprint at a glance.
 *  • Cards are slim; columns scroll vertically.
 *
 * Interactions:
 *  Click           — select / place cards
 *  Double-click    — auto-move top card to matching foundation
 *  Esc / Exit btn  — return to main menu
 *  Enter (on win)  — restart
 */
export class JiraSkin implements Skin {
  private container: HTMLElement | null = null
  private actionHandler:
    | ((pile: PileType, pileIndex: number, cardIndex: number, isDouble: boolean) => void)
    | null = null
  private exitHandler:    (() => void) | null = null
  private restartHandler: (() => void) | null = null

  initialize(): void {
    this.injectStyles()
    const root = document.getElementById('app') ?? document.body
    const el   = document.createElement('div')
    el.id = 'jira-skin'
    el.setAttribute('tabindex', '0')
    el.innerHTML = this.buildShell()
    root.appendChild(el)
    this.container = el
    this.attachListeners()
    el.focus()
  }

  render(gameState: GameState): void {
    if (!this.container) return
    this.renderState(gameState as unknown as SolitaireGameState)
  }

  setActionHandler(
    handler: (pile: PileType, pileIndex: number, cardIndex: number, isDouble: boolean) => void,
  ): void {
    this.actionHandler = handler
  }

  setExitHandler(handler: () => void): void {
    this.exitHandler = handler
  }

  setRestartHandler(handler: () => void): void {
    this.restartHandler = handler
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bindInput(_callback: InputEventHandler): void {}

  destroy(): void {
    this.container?.remove()
    this.container = null
    this.actionHandler = null
    this.exitHandler   = null
    this.restartHandler = null
    document.getElementById(STYLE_ID)?.remove()
  }

  // ── Shell ──────────────────────────────────────────────────────────────────

  private buildShell(): string {
    const foundations = SUITS.map((suit, i) => `
      <div class="jira-deck__section">
        <div class="jira-deck__label">${SUIT_CODE[suit]}</div>
        <div class="jira-foundation-slot"
             data-pile="foundation" data-pile-index="${i}" data-card-index="-1">
          ${renderEmptySlot(SUIT_SYMBOL[suit], `color:${SUIT_COLOUR[suit]};font-size:20px`)}
        </div>
      </div>
    `).join('')

    const columns = COLUMN_NAMES.map((name, i) => `
      <div class="jira-column">
        <div class="jira-column__header">
          <span class="jira-column__name">${name}</span>
          <span class="jira-column__count" id="col-count-${i}">0</span>
        </div>
        <div class="jira-column__body"
             id="col-body-${i}"
             data-pile="tableau" data-pile-index="${i}" data-card-index="-1">
        </div>
      </div>
    `).join('')

    return `
      <div class="jira-header">
        <div class="jira-header__left">
          <span class="jira-logo">🔷</span>
          <span class="jira-project">WORK Board</span>
          <span class="jira-sprint">Sprint 42 ▾</span>
        </div>
        <nav class="jira-nav">
          <span class="jira-nav__item jira-nav__item--active">Board</span>
          <span class="jira-nav__item">Backlog</span>
          <span class="jira-nav__item">Reports</span>
          <span class="jira-nav__item">Roadmap</span>
        </nav>
        <div class="jira-header__right">
          <span class="jira-stat" id="jira-score">Score: 0</span>
          <span class="jira-stat" id="jira-moves">Moves: 0</span>
          <button class="jira-exit-btn" id="jira-exit-btn">✕ Exit</button>
        </div>
      </div>

      <div class="jira-deck-bar">
        <div class="jira-deck__section">
          <div class="jira-deck__label">STOCK</div>
          <div class="jira-stock-slot"
               data-pile="stock" data-pile-index="0" data-card-index="0">
            ${renderEmptySlot('↺', 'font-size:22px')}
          </div>
        </div>
        <div class="jira-deck__section">
          <div class="jira-deck__label">WASTE</div>
          <div class="jira-waste-slot"
               data-pile="waste" data-pile-index="0" data-card-index="-1">
            ${renderEmptySlot('—')}
          </div>
        </div>
        <div class="jira-deck__spacer"></div>
        ${foundations}
      </div>

      <div class="jira-board">
        ${columns}
      </div>

      <div class="jira-win-overlay" id="jira-win-overlay" style="display:none">
        <div class="jira-win-box">
          <div class="jira-win-icon">🎉</div>
          <h2>Sprint Complete!</h2>
          <p>All tickets deployed to production.</p>
          <p class="jira-win-detail" id="jira-win-score">Score: 0</p>
          <p class="jira-win-detail" id="jira-win-moves">Moves: 0</p>
          <p class="jira-win-hint">
            Press <strong>Enter</strong> to play again &nbsp;·&nbsp;
            <strong>Esc</strong> to exit
          </p>
        </div>
      </div>

      <div class="jira-hint-bar">
        Click to select · Click again to place · Double-click to auto-send to foundation · Esc to exit
      </div>
    `
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  private renderState(state: SolitaireGameState): void {
    if (!this.container) return

    const scoreEl = this.container.querySelector('#jira-score')
    const movesEl = this.container.querySelector('#jira-moves')
    if (scoreEl) scoreEl.textContent = `Score: ${state.score}`
    if (movesEl) movesEl.textContent = `Moves: ${state.moves}`

    // ── Stock ────────────────────────────────────────────────────────────────
    const stockSlot = this.container.querySelector('.jira-stock-slot')
    if (stockSlot) {
      if (state.stock.length > 0) {
        const topStock = state.stock[state.stock.length - 1]
        stockSlot.innerHTML = `
          <div data-pile="stock" data-pile-index="0" data-card-index="0"
               class="jira-stock-wrap">
            ${renderCardBack(topStock)}
            <span class="jira-stock-count">${state.stock.length}</span>
          </div>
        `
      } else {
        stockSlot.innerHTML = `
          <div data-pile="stock" data-pile-index="0" data-card-index="0"
               class="jira-stock-wrap">
            <div class="jira-card jira-card--recycle">↺ Redeal</div>
          </div>
        `
      }
    }

    // ── Waste ─────────────────────────────────────────────────────────────────
    const wasteSlot = this.container.querySelector('.jira-waste-slot')
    if (wasteSlot) {
      if (state.waste.length > 0) {
        const top = state.waste[state.waste.length - 1]
        const sel = state.selection?.pile === 'waste'
        wasteSlot.innerHTML = `
          <div data-pile="waste" data-pile-index="0"
               data-card-index="${state.waste.length - 1}">
            ${renderCardFace(top, sel, false)}
          </div>
        `
      } else {
        wasteSlot.innerHTML = renderEmptySlot('—')
      }
    }

    // ── Foundation ────────────────────────────────────────────────────────────
    SUITS.forEach((suit, i) => {
      const slot = this.container!.querySelector(`.jira-foundation-slot[data-pile-index="${i}"]`)
      if (!slot) return
      const pile = state.foundation[i]
      if (pile.length > 0) {
        const top = pile[pile.length - 1]
        const sel = state.selection?.pile === 'foundation' && state.selection.pileIndex === i
        slot.innerHTML = `
          <div data-pile="foundation" data-pile-index="${i}"
               data-card-index="${pile.length - 1}">
            ${renderCardFace(top, sel, false)}
            <div class="jira-foundation-progress">${pile.length}/13</div>
          </div>
        `
      } else {
        slot.innerHTML = `
          <div data-pile="foundation" data-pile-index="${i}" data-card-index="-1">
            ${renderEmptySlot(SUIT_SYMBOL[suit], `color:${SUIT_COLOUR[suit]};font-size:20px`)}
          </div>
        `
      }
    })

    // ── Tableau ────────────────────────────────────────────────────────────────
    for (let col = 0; col < 7; col++) {
      const body  = this.container.querySelector(`#col-body-${col}`)
      const count = this.container.querySelector(`#col-count-${col}`)
      if (!body) continue
      const cards = state.tableau[col]
      if (count) count.textContent = String(cards.length)

      if (cards.length === 0) {
        body.innerHTML = `
          <div class="jira-empty-col"
               data-pile="tableau" data-pile-index="${col}" data-card-index="-1">
            Drop here
          </div>
        `
        continue
      }

      body.innerHTML = cards.map((card, idx) => {
        const isSel     = state.selection?.pile === 'tableau' &&
                          state.selection.pileIndex === col &&
                          state.selection.cardIndex === idx
        const inStack   = state.selection?.pile === 'tableau' &&
                          state.selection.pileIndex === col &&
                          typeof state.selection.cardIndex === 'number' &&
                          state.selection.cardIndex <= idx

        return `
          <div class="jira-tableau-card${inStack ? ' jira-tableau-card--stacked' : ''}"
               data-pile="tableau" data-pile-index="${col}" data-card-index="${idx}">
            ${card.faceUp
              ? renderCardFace(card, isSel, true)
              : renderCardBack(card)}
          </div>
        `
      }).join('')
    }

    // ── Win overlay ───────────────────────────────────────────────────────────
    const overlay = this.container.querySelector('#jira-win-overlay') as HTMLElement | null
    if (overlay) {
      overlay.style.display = state.status === 'won' ? 'flex' : 'none'
      const ws = overlay.querySelector('#jira-win-score')
      const wm = overlay.querySelector('#jira-win-moves')
      if (ws) ws.textContent = `Score: ${state.score}`
      if (wm) wm.textContent = `Moves: ${state.moves}`
    }
  }

  // ── Listeners ──────────────────────────────────────────────────────────────

  private attachListeners(): void {
    if (!this.container) return

    this.container.addEventListener('click', (e: MouseEvent) => {
      const cardEl = (e.target as HTMLElement).closest('[data-pile]') as HTMLElement | null
      if (!cardEl) return
      const pile      = cardEl.dataset.pile as PileType
      const pileIndex = parseInt(cardEl.dataset.pileIndex ?? '0', 10)
      const cardIndex = parseInt(cardEl.dataset.cardIndex ?? '-1', 10)
      if (pile) this.actionHandler?.(pile, pileIndex, cardIndex, false)
    })

    this.container.addEventListener('dblclick', (e: MouseEvent) => {
      const cardEl = (e.target as HTMLElement).closest('[data-pile]') as HTMLElement | null
      if (!cardEl) return
      const pile      = cardEl.dataset.pile as PileType
      const pileIndex = parseInt(cardEl.dataset.pileIndex ?? '0', 10)
      const cardIndex = parseInt(cardEl.dataset.cardIndex ?? '-1', 10)
      if (pile === 'waste' || pile === 'tableau') {
        this.actionHandler?.(pile, pileIndex, cardIndex, true)
      }
    })

    this.container.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.exitHandler?.()
      } else if (e.key === 'Enter') {
        const ov = this.container?.querySelector('#jira-win-overlay') as HTMLElement | null
        if (ov?.style.display === 'flex') this.restartHandler?.()
      }
    })

    this.container.querySelector('#jira-exit-btn')
      ?.addEventListener('click', () => this.exitHandler?.())
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; overflow: hidden; }

      /* ── Skin root ────────────────────────────────────────────────────────── */
      #jira-skin {
        display: flex;
        flex-direction: column;
        position: fixed;
        inset: 0;
        background: #F4F5F7;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                     'Helvetica Neue', Arial, sans-serif;
        font-size: 13px;
        user-select: none;
        outline: none;
        overflow: hidden;
      }

      /* ── Header ───────────────────────────────────────────────────────────── */
      .jira-header {
        display: flex;
        align-items: center;
        background: #0052CC;
        height: 48px;
        padding: 0 16px;
        gap: 20px;
        flex-shrink: 0;
        box-shadow: 0 1px 0 rgba(0,0,0,0.3);
      }
      .jira-header__left  { display: flex; align-items: center; gap: 10px; }
      .jira-logo          { font-size: 20px; }
      .jira-project       { color: #fff; font-weight: 700; font-size: 14px; }
      .jira-sprint {
        color: rgba(255,255,255,0.75);
        font-size: 12px;
        background: rgba(255,255,255,0.12);
        border-radius: 3px;
        padding: 2px 8px;
        cursor: default;
      }
      .jira-nav           { display: flex; gap: 2px; flex: 1; justify-content: center; }
      .jira-nav__item {
        color: rgba(255,255,255,0.72);
        padding: 6px 12px;
        border-radius: 3px;
        cursor: default;
        font-size: 13px;
      }
      .jira-nav__item:hover         { background: rgba(255,255,255,0.15); color: #fff; }
      .jira-nav__item--active       { color: #fff; background: rgba(255,255,255,0.18); font-weight: 600; }
      .jira-header__right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
      .jira-stat          { color: rgba(255,255,255,0.85); font-size: 12px; white-space: nowrap; }
      .jira-exit-btn {
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.3);
        color: #fff;
        padding: 4px 12px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      }
      .jira-exit-btn:hover { background: rgba(255,255,255,0.28); }

      /* ── Deck bar ─────────────────────────────────────────────────────────── */
      .jira-deck-bar {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        background: #EBECF0;
        border-bottom: 1px solid #C1C7D0;
        padding: 8px 16px;
        flex-shrink: 0;
      }
      .jira-deck__section { display: flex; flex-direction: column; align-items: center; gap: 3px; }
      .jira-deck__label {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .07em;
        color: #5E6C84;
        text-transform: uppercase;
      }
      .jira-deck__spacer { flex: 1; }

      /* ── Empty slots ──────────────────────────────────────────────────────── */
      .jira-empty-slot {
        width: 160px;
        height: 66px;
        border: 2px dashed #C1C7D0;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #97A0AF;
        font-size: 13px;
        background: rgba(255,255,255,0.4);
        cursor: pointer;
      }
      .jira-empty-slot:hover { border-color: #0052CC; }

      .jira-empty-col {
        width: 100%;
        min-height: 60px;
        border: 2px dashed #C1C7D0;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #B3BAC5;
        font-size: 11px;
        background: rgba(255,255,255,0.25);
        cursor: pointer;
        margin-top: 2px;
      }
      .jira-empty-col:hover { border-color: #0052CC; }

      /* ── Cards ────────────────────────────────────────────────────────────── */

      /* Base card — all variants share this */
      .jira-card {
        width: 100%;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #DFE1E6;
        cursor: pointer;
        transition: box-shadow .12s, transform .1s;
        overflow: hidden;
      }
      .jira-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.15); }

      /* ── Face-up card ─────────────────────────────────────────────────────── */
      .jira-card--face {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 6px 8px 5px;
      }

      /* Compact variant (used inside tableau columns — same layout, no extra tweak needed) */
      .jira-card--compact {}

      .jira-card__top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
      }
      .jira-card__issue-type {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .02em;
        white-space: nowrap;
      }

      /* The indicator replaces the Jira issue number (e.g. "SPD-004", "HRT-KING").
         Font-weight bold, monospace, colour set inline per suit. */
      .jira-card__indicator {
        font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', Menlo, monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .04em;
        white-space: nowrap;
        padding: 1px 4px;
        border-radius: 3px;
        background: #F4F5F7;
        border: 1px solid #DFE1E6;
      }

      .jira-card__title {
        font-size: 11px;
        color: #172B4D;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .jira-card__bottom-row {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 1px;
      }
      .jira-card__avatar {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 7px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .jira-card__points {
        font-size: 9px;
        color: #6B778C;
        background: #F4F5F7;
        border: 1px solid #DFE1E6;
        border-radius: 10px;
        padding: 1px 5px;
      }

      /* Selected card ring */
      .jira-card--selected {
        box-shadow: 0 0 0 2px #0052CC !important;
        transform: translateY(-1px);
      }

      /* Stack highlight — cards below the selected card in the same column */
      .jira-tableau-card--stacked .jira-card {
        box-shadow: 0 0 0 1px #4C9AFF;
      }

      /* ── Face-down card (unrevealed Jira ticket) ──────────────────────────── */
      /* Same layout as face-up; just a subtle background tint to signal "not yet revealed". */
      .jira-card--hidden {
        background: #FAFBFC;
        cursor: default;
      }

      /* The "WORK-?????" indicator on face-down cards — greyed out */
      .jira-card__indicator--hidden {
        font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', Menlo, monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .04em;
        color: #97A0AF;
        padding: 1px 4px;
        border-radius: 3px;
        background: #F4F5F7;
        border: 1px solid #EBECF0;
      }

      /* ── Recycle card ─────────────────────────────────────────────────────── */
      .jira-card--recycle {
        height: 66px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: #5E6C84;
        background: #DFE1E6;
        border: none;
        gap: 4px;
        cursor: pointer;
      }
      .jira-card--recycle:hover { background: #C1C7D0; }

      /* Stock wrapper (relative, for the count badge) */
      .jira-stock-wrap { position: relative; width: 160px; }
      .jira-stock-count {
        position: absolute;
        top: 4px;
        right: 6px;
        background: #DE350B;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        border-radius: 8px;
        padding: 1px 5px;
        pointer-events: none;
      }

      .jira-foundation-slot { position: relative; }
      .jira-foundation-progress {
        text-align: center;
        font-size: 9px;
        font-weight: 700;
        color: #5E6C84;
        margin-top: 2px;
      }

      /* ── Board ────────────────────────────────────────────────────────────── */
      .jira-board {
        display: flex;
        gap: 8px;
        padding: 10px 16px 10px;
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        align-items: flex-start;
      }
      .jira-column {
        display: flex;
        flex-direction: column;
        min-width: 176px;
        max-width: 176px;
        flex-shrink: 0;
        height: 100%;
      }
      .jira-column__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        background: #EBECF0;
        border-radius: 4px 4px 0 0;
        border: 1px solid #DFE1E6;
        border-bottom: none;
        flex-shrink: 0;
      }
      .jira-column__name {
        font-size: 11px;
        font-weight: 700;
        color: #5E6C84;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .jira-column__count {
        background: #DFE1E6;
        color: #42526E;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
      }
      .jira-column__body {
        background: #EBECF0;
        border: 1px solid #DFE1E6;
        border-top: none;
        border-radius: 0 0 4px 4px;
        padding: 6px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      /* ── Hint bar ─────────────────────────────────────────────────────────── */
      .jira-hint-bar {
        background: #253858;
        color: rgba(255,255,255,0.5);
        font-size: 10px;
        text-align: center;
        padding: 3px 8px;
        flex-shrink: 0;
      }

      /* ── Win overlay ──────────────────────────────────────────────────────── */
      .jira-win-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.55);
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      .jira-win-box {
        background: #fff;
        border-radius: 8px;
        padding: 32px 44px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        border-top: 4px solid #36B37E;
        max-width: 360px;
      }
      .jira-win-icon  { font-size: 44px; margin-bottom: 6px; }
      .jira-win-box h2 { margin: 0 0 8px; color: #172B4D; font-size: 20px; }
      .jira-win-box > p { margin: 4px 0; color: #5E6C84; font-size: 13px; }
      .jira-win-detail  { font-weight: 700; color: #0052CC !important; }
      .jira-win-hint    { font-size: 11px; color: #B3BAC5 !important; margin-top: 14px !important; }
    `
    document.head.appendChild(style)
  }
}
