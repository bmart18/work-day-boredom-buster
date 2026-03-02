import type { Skin, GameState } from './Skin'
import type { InputEventHandler } from '../engine/inputRouter'
import type { SnakeGameState, SnakeCellType } from '../games/snakeGame'

const STYLE_ID = 'xl-skin-styles'

const CELL_W = 30
const CELL_H = 22
const ROW_HEADER_W = 36
const COL_HEADER_H = 20

/** Convert a zero-based column index to an Excel-style letter (A, B, … Z, AA, …). */
function colLabel(index: number): string {
  let label = ''
  let n = index + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

const CELL_CLASS: Record<SnakeCellType, string> = {
  empty: '',
  head: 'xl-cell-head',
  snake: 'xl-cell-snake',
  food: 'xl-cell-food',
}

/**
 * ExcelSkin renders the Snake game inside a convincing Microsoft Excel
 * spreadsheet interface.
 *
 * Implements the Skin contract; the host provides game state via render()
 * and the skin updates only DOM nodes that have changed.
 */
export class ExcelSkin implements Skin {
  private container: HTMLElement | null = null
  private cellEls: HTMLElement[][] = []
  private formulaInput: HTMLElement | null = null
  private nameBox: HTMLElement | null = null
  private scoreEl: HTMLElement | null = null
  private highScoreEl: HTMLElement | null = null
  private gameOverEl: HTMLElement | null = null
  private gameOverScoreEl: HTMLElement | null = null
  private prevGrid: SnakeCellType[][] = []

  initialize(): void {
    this.injectStyles()

    const root = document.getElementById('app') ?? document.body

    const container = document.createElement('div')
    container.id = 'excel-skin'
    container.setAttribute('tabindex', '0')

    container.innerHTML = this.buildHTML(DEFAULT_ROWS, DEFAULT_COLS)
    root.appendChild(container)
    this.container = container

    // Cache frequently-updated elements
    this.formulaInput = container.querySelector('.xl-formula-input')
    this.nameBox = container.querySelector('.xl-name-box')
    this.scoreEl = container.querySelector('.xl-status-score')
    this.highScoreEl = container.querySelector('.xl-status-highscore')
    this.gameOverEl = container.querySelector('.xl-gameover')
    this.gameOverScoreEl = container.querySelector('.xl-gameover-score')

    // Build cell element cache
    const rows = container.querySelectorAll<HTMLElement>('.xl-data-row')
    this.cellEls = Array.from(rows, (row) =>
      Array.from(row.querySelectorAll<HTMLElement>('.xl-cell')),
    )
    this.prevGrid = []
  }

  render(gameState: GameState): void {
    const state = gameState as unknown as SnakeGameState & { highScore?: number }
    if (!this.container || !state.grid) return

    const { grid, score, status, rows, cols } = state
    const highScore = state.highScore ?? 0

    // Update formula bar with head position
    const headRow = grid.findIndex((r) => r.includes('head'))
    const headCol = headRow >= 0 ? grid[headRow].indexOf('head') : 0
    if (this.nameBox) {
      this.nameBox.textContent = headRow >= 0 ? `${colLabel(headCol)}${headRow + 1}` : 'A1'
    }
    if (this.formulaInput) {
      this.formulaInput.textContent =
        status === 'gameover' ? '=GAME_OVER()' : `=SNAKE_SCORE(${score})`
    }

    // Update grid cells — only touch changed cells
    for (let r = 0; r < rows && r < this.cellEls.length; r++) {
      const prevRow = this.prevGrid[r]
      for (let c = 0; c < cols && c < this.cellEls[r].length; c++) {
        const cellType = grid[r][c]
        if (prevRow && prevRow[c] === cellType) continue
        const el = this.cellEls[r][c]
        el.className = 'xl-cell' + (CELL_CLASS[cellType] ? ' ' + CELL_CLASS[cellType] : '')
      }
    }
    this.prevGrid = grid.map((row) => [...row])

    // Status bar
    if (this.scoreEl) this.scoreEl.textContent = `Score: ${score}`
    if (this.highScoreEl) this.highScoreEl.textContent = `High Score: ${highScore}`

    // Game-over overlay
    if (this.gameOverEl) {
      this.gameOverEl.style.display = status === 'gameover' ? 'flex' : 'none'
      if (this.gameOverScoreEl) this.gameOverScoreEl.textContent = `Score: ${score}`
    }
  }

  /** Stores a callback for future click-based cell input routing. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bindInput(_callback: InputEventHandler): void {
    // Cell-click input routing is reserved for a future phase.
  }

  destroy(): void {
    this.container?.remove()
    this.container = null
    this.cellEls = []
    this.prevGrid = []
    document.getElementById(STYLE_ID)?.remove()
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildHTML(rows: number, cols: number): string {
    const colHeaders = Array.from(
      { length: cols },
      (_, i) => `<div class="xl-col-header">${colLabel(i)}</div>`,
    ).join('')

    const dataRows = Array.from({ length: rows }, (_, r) => {
      const cells = Array.from({ length: cols }, () => `<div class="xl-cell"></div>`).join('')
      return `<div class="xl-data-row"><div class="xl-row-header">${r + 1}</div>${cells}</div>`
    }).join('')

    return `
      <div class="xl-titlebar">
        <div class="xl-titlebar-icon">&#128196;</div>
        <span class="xl-titlebar-name">Snake.xlsx — Microsoft Excel</span>
        <div class="xl-titlebar-controls">
          <span class="xl-titlebar-btn xl-btn-min">&#8722;</span>
          <span class="xl-titlebar-btn xl-btn-max">&#9633;</span>
          <span class="xl-titlebar-btn xl-btn-close">&#10005;</span>
        </div>
      </div>
      <div class="xl-ribbon">
        <div class="xl-ribbon-tabs">
          <span class="xl-tab xl-tab-active">Home</span>
          <span class="xl-tab">Insert</span>
          <span class="xl-tab">Page Layout</span>
          <span class="xl-tab">Formulas</span>
          <span class="xl-tab">Data</span>
          <span class="xl-tab">Review</span>
          <span class="xl-tab">View</span>
        </div>
      </div>
      <div class="xl-formulabar">
        <div class="xl-name-box">A1</div>
        <div class="xl-fx-sep"></div>
        <span class="xl-fx-label">f<em>x</em></span>
        <div class="xl-formula-input">=SNAKE_SCORE(0)</div>
      </div>
      <div class="xl-grid-wrap">
        <div class="xl-header-row">
          <div class="xl-corner"></div>
          ${colHeaders}
        </div>
        ${dataRows}
      </div>
      <div class="xl-sheettabs">
        <div class="xl-sheettab-scroll">&#8249;</div>
        <span class="xl-sheettab xl-sheettab-active">Snake</span>
        <span class="xl-sheettab">Sheet2</span>
        <span class="xl-sheettab">Sheet3</span>
        <div class="xl-sheettab-scroll">&#8250;</div>
      </div>
      <div class="xl-statusbar">
        <span>Ready</span>
        <span class="xl-status-score">Score: 0</span>
        <span class="xl-status-highscore">High Score: 0</span>
        <span class="xl-status-hint">Esc: Switch game</span>
      </div>
      <div class="xl-gameover" style="display:none">
        <div class="xl-gameover-box">
          <h2>Game Over</h2>
          <p class="xl-gameover-score">Score: 0</p>
          <p class="xl-gameover-hint">Press <strong>Enter</strong> to play again &nbsp;·&nbsp; <strong>Esc</strong> to switch game</p>
        </div>
      </div>
    `
  }

  private injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      * { box-sizing: border-box; }

      #excel-skin {
        font-family: Calibri, 'Segoe UI', Arial, sans-serif;
        font-size: 11px;
        display: inline-flex;
        flex-direction: column;
        border: 1px solid #ababab;
        user-select: none;
        outline: none;
        position: relative;
        background: #f0f0f0;
      }

      /* ── Title bar ─────────────────────────────────────────── */
      .xl-titlebar {
        background: #217346;
        display: flex;
        align-items: center;
        height: 28px;
        padding: 0 8px;
        flex-shrink: 0;
        gap: 6px;
      }
      .xl-titlebar-icon { font-size: 14px; }
      .xl-titlebar-name {
        flex: 1;
        text-align: center;
        font-size: 11px;
        color: rgba(255,255,255,0.9);
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      .xl-titlebar-controls { display: flex; gap: 2px; }
      .xl-titlebar-btn {
        width: 26px;
        height: 20px;
        text-align: center;
        line-height: 20px;
        font-size: 12px;
        color: rgba(255,255,255,0.8);
        border-radius: 3px;
        cursor: default;
      }
      .xl-titlebar-btn:hover { background: rgba(255,255,255,0.15); }
      .xl-btn-close:hover { background: #c42b1c; color: #fff; }

      /* ── Ribbon ────────────────────────────────────────────── */
      .xl-ribbon {
        background: #217346;
        flex-shrink: 0;
      }
      .xl-ribbon-tabs {
        display: flex;
        padding: 0 4px;
      }
      .xl-tab {
        color: rgba(255,255,255,0.85);
        padding: 8px 12px 6px;
        cursor: default;
        font-size: 11px;
      }
      .xl-tab-active {
        color: #217346;
        background: #fff;
        border-radius: 3px 3px 0 0;
        padding-bottom: 8px;
      }

      /* ── Formula bar ───────────────────────────────────────── */
      .xl-formulabar {
        display: flex;
        align-items: center;
        background: #fff;
        border-bottom: 1px solid #ccc;
        height: 26px;
        padding: 2px 4px;
        gap: 4px;
        flex-shrink: 0;
      }
      .xl-name-box {
        width: 52px;
        border: 1px solid #b8b8b8;
        padding: 1px 4px;
        text-align: center;
        font-size: 11px;
        flex-shrink: 0;
        background: #fff;
      }
      .xl-fx-sep {
        width: 1px;
        height: 16px;
        background: #ccc;
        flex-shrink: 0;
      }
      .xl-fx-label {
        color: #555;
        font-size: 13px;
        flex-shrink: 0;
        width: 20px;
        text-align: center;
      }
      .xl-formula-input {
        flex: 1;
        font-size: 11px;
        color: #333;
        overflow: hidden;
        white-space: nowrap;
      }

      /* ── Grid ──────────────────────────────────────────────── */
      .xl-grid-wrap {
        overflow: auto;
        flex-shrink: 0;
      }
      .xl-header-row,
      .xl-data-row {
        display: flex;
      }
      .xl-corner {
        width: ${ROW_HEADER_W}px;
        min-width: ${ROW_HEADER_W}px;
        height: ${COL_HEADER_H}px;
        background: #e2e2e2;
        border-right: 1px solid #ababab;
        border-bottom: 1px solid #ababab;
        flex-shrink: 0;
      }
      .xl-col-header {
        width: ${CELL_W}px;
        min-width: ${CELL_W}px;
        height: ${COL_HEADER_H}px;
        background: #e2e2e2;
        border-right: 1px solid #d0d0d0;
        border-bottom: 1px solid #ababab;
        text-align: center;
        line-height: ${COL_HEADER_H}px;
        font-size: 10px;
        color: #444;
        flex-shrink: 0;
      }
      .xl-row-header {
        width: ${ROW_HEADER_W}px;
        min-width: ${ROW_HEADER_W}px;
        height: ${CELL_H}px;
        background: #e2e2e2;
        border-right: 1px solid #ababab;
        border-bottom: 1px solid #d0d0d0;
        text-align: center;
        line-height: ${CELL_H}px;
        font-size: 10px;
        color: #444;
        flex-shrink: 0;
      }
      .xl-cell {
        width: ${CELL_W}px;
        min-width: ${CELL_W}px;
        height: ${CELL_H}px;
        background: #fff;
        border-right: 1px solid #d0d0d0;
        border-bottom: 1px solid #d0d0d0;
        flex-shrink: 0;
      }
      .xl-cell-head  { background: #1a5c38; }
      .xl-cell-snake { background: #70ad47; }
      .xl-cell-food  { background: #e03b24; }

      /* ── Sheet tabs ────────────────────────────────────────── */
      .xl-sheettabs {
        display: flex;
        align-items: center;
        border-top: 1px solid #bbb;
        background: #d9d9d9;
        padding: 0 4px;
        height: 22px;
        flex-shrink: 0;
      }
      .xl-sheettab {
        padding: 3px 12px;
        background: #c4c4c4;
        border: 1px solid #b0b0b0;
        border-bottom: none;
        margin-right: 2px;
        font-size: 11px;
        cursor: default;
        border-radius: 3px 3px 0 0;
      }
      .xl-sheettab-active {
        background: #fff;
        border-color: #bbb;
      }
      .xl-sheettab-scroll {
        font-size: 14px;
        padding: 0 4px;
        color: #666;
        cursor: default;
      }

      /* ── Status bar ────────────────────────────────────────── */
      .xl-statusbar {
        background: #217346;
        color: #fff;
        display: flex;
        justify-content: space-between;
        padding: 2px 10px;
        font-size: 11px;
        flex-shrink: 0;
      }
      .xl-status-hint {
        opacity: 0.65;
        font-style: italic;
      }

      /* ── Game-over overlay ─────────────────────────────────── */
      .xl-gameover {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        align-items: center;
        justify-content: center;
      }
      .xl-gameover-box {
        background: #fff;
        padding: 28px 40px;
        border: 2px solid #217346;
        border-radius: 4px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      }
      .xl-gameover-box h2 {
        margin: 0 0 12px;
        color: #c00;
        font-size: 22px;
      }
      .xl-gameover-score {
        font-size: 15px;
        margin: 4px 0;
        font-weight: bold;
      }
      .xl-gameover-hint {
        font-size: 12px;
        color: #555;
        margin-top: 10px;
      }
    `
    document.head.appendChild(style)
  }
}

/** Default grid dimensions used when building the initial HTML. */
const DEFAULT_ROWS = 20
const DEFAULT_COLS = 20
