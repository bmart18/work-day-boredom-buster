import type { Skin, GameState } from './Skin'
import type { InputEventHandler } from '../engine/inputRouter'
import type { TypingGameState } from '../games/typingGame'

const STYLE_ID = 'ide-skin-styles'

const EDITOR_FONT = "'Cascadia Code', 'Fira Code', 'Consolas', monospace"

// ── Syntax-colour helpers ────────────────────────────────────────────────────

function buildCodeHTML(prompt: string, typed: string): string {
  const parts: string[] = []
  for (let i = 0; i < prompt.length; i++) {
    const ch = prompt[i] === ' ' ? '&nbsp;' : escapeHtml(prompt[i])
    if (i < typed.length) {
      parts.push(`<span class="ide-char-correct">${ch}</span>`)
    } else if (i === typed.length) {
      parts.push(`<span class="ide-char-cursor">${ch}</span>`)
    } else {
      parts.push(`<span class="ide-char-pending">${ch}</span>`)
    }
  }
  // Append a trailing cursor when prompt is fully typed (should not happen in
  // practice as the game immediately loads the next prompt, but guard anyway).
  if (typed.length >= prompt.length) {
    parts.push('<span class="ide-char-cursor">&nbsp;</span>')
  }
  return parts.join('')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

function difficultyLabel(level: number): string {
  if (level >= 3) return 'Hard'
  if (level >= 2) return 'Medium'
  return 'Easy'
}

// ── IDESkin ──────────────────────────────────────────────────────────────────

/**
 * IdeSkin renders the TypingGame inside a convincing VS Code-style dark IDE.
 *
 * Implements the Skin contract; the host provides game state via render() and
 * the skin updates only the DOM nodes that have changed.
 */
export class IdeSkin implements Skin {
  private container: HTMLElement | null = null
  private wpmEl: HTMLElement | null = null
  private accuracyEl: HTMLElement | null = null
  private scoreEl: HTMLElement | null = null
  private difficultyEl: HTMLElement | null = null
  private timerEl: HTMLElement | null = null
  private timerBarEl: HTMLElement | null = null
  private gameOverEl: HTMLElement | null = null
  private gameOverScoreEl: HTMLElement | null = null
  private gameOverWpmEl: HTMLElement | null = null
  private gutterEl: HTMLElement | null = null
  private linesEl: HTMLElement | null = null
  private scrollAreaEl: HTMLElement | null = null
  private maxTimeMs: number = 60_000
  private completedLines: string[] = []
  private prevPrompt: string = ''

  initialize(): void {
    this.injectStyles()

    const root = document.getElementById('app') ?? document.body

    const container = document.createElement('div')
    container.id = 'ide-skin'
    container.setAttribute('tabindex', '0')
    container.innerHTML = this.buildHTML()
    root.appendChild(container)
    this.container = container

    this.wpmEl = container.querySelector('.ide-stat-wpm')
    this.accuracyEl = container.querySelector('.ide-stat-acc')
    this.scoreEl = container.querySelector('.ide-stat-score')
    this.difficultyEl = container.querySelector('.ide-stat-diff')
    this.timerEl = container.querySelector('.ide-stat-timer')
    this.timerBarEl = container.querySelector('.ide-timer-bar-fill')
    this.gameOverEl = container.querySelector('.ide-gameover')
    this.gameOverScoreEl = container.querySelector('.ide-gameover-score')
    this.gameOverWpmEl = container.querySelector('.ide-gameover-wpm')
    this.gutterEl = container.querySelector('.ide-gutter')
    this.linesEl = container.querySelector('.ide-lines')
    this.scrollAreaEl = container.querySelector('.ide-scroll-area')
    this.completedLines = []
    this.prevPrompt = ''
  }

  render(gameState: GameState): void {
    const state = gameState as unknown as TypingGameState
    if (!this.container) return

    const { prompt, typed, wpm, accuracy, score, status, difficulty, timeRemainingMs } = state

    // Track completed lines: when prompt changes, the previous one was fully typed
    if (this.prevPrompt !== '' && prompt !== this.prevPrompt) {
      this.completedLines.push(this.prevPrompt)
    }
    this.prevPrompt = prompt

    // Update scrolling editor lines
    this.updateEditorLines(prompt, typed)

    // Update status bar stats
    if (this.wpmEl) this.wpmEl.textContent = `WPM: ${wpm}`
    if (this.accuracyEl) this.accuracyEl.textContent = `Acc: ${accuracy}%`
    if (this.scoreEl) this.scoreEl.textContent = `Score: ${score}`
    if (this.difficultyEl) this.difficultyEl.textContent = difficultyLabel(difficulty)
    if (this.timerEl) this.timerEl.textContent = `⏱ ${formatTime(timeRemainingMs)}`

    // Update max time reference when difficulty changes (60/50/40 s)
    const capMs = difficulty === 3 ? 40_000 : difficulty === 2 ? 50_000 : 60_000
    this.maxTimeMs = capMs

    // Timer bar
    if (this.timerBarEl) {
      const pct = Math.max(0, Math.min(100, (timeRemainingMs / this.maxTimeMs) * 100))
      this.timerBarEl.style.width = `${pct}%`
      // Colour shifts red as time runs low
      this.timerBarEl.style.background = pct > 40 ? '#4ec9b0' : pct > 15 ? '#e5c07b' : '#e06c75'
    }

    // Game-over overlay
    if (this.gameOverEl) {
      this.gameOverEl.style.display = status === 'gameover' ? 'flex' : 'none'
      if (status === 'gameover') {
        if (this.gameOverScoreEl) this.gameOverScoreEl.textContent = `Score: ${score}`
        if (this.gameOverWpmEl) this.gameOverWpmEl.textContent = `Peak WPM: ${wpm}`
      }
    }
  }

  /** Stores a callback for future input routing extensions. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bindInput(_callback: InputEventHandler): void {
    // Keyboard input for the typing game is routed directly via the
    // InputRouter in main.ts; no additional binding required here.
  }

  destroy(): void {
    this.container?.remove()
    this.container = null
    this.completedLines = []
    this.prevPrompt = ''
    document.getElementById(STYLE_ID)?.remove()
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Rebuild the scrolling editor gutter and lines, then pin to bottom. */
  private updateEditorLines(prompt: string, typed: string): void {
    if (!this.gutterEl || !this.linesEl) return

    const HISTORY_VISIBLE = 10
    const history = this.completedLines.slice(-HISTORY_VISIBLE)
    const startLineNum = Math.max(1, this.completedLines.length - history.length + 1)

    let gutterHTML = ''
    let linesHTML = ''

    // Render completed (history) lines
    for (let i = 0; i < history.length; i++) {
      const lineNum = startLineNum + i
      gutterHTML += `<div class="ide-line-num">${lineNum}</div>`
      linesHTML += `<div class="ide-line"><span class="ide-completed-line">${escapeHtml(history[i])}</span></div>`
    }

    // Render active line
    const activeLineNum = this.completedLines.length + 1
    gutterHTML += `<div class="ide-line-num ide-line-active">${activeLineNum}</div>`
    linesHTML += `<div class="ide-line ide-line-active"><span class="ide-code-line">${buildCodeHTML(prompt, typed)}</span></div>`

    this.gutterEl.innerHTML = gutterHTML
    this.linesEl.innerHTML = linesHTML

    // Scroll to keep the active line visible
    if (this.scrollAreaEl) {
      this.scrollAreaEl.scrollTop = this.scrollAreaEl.scrollHeight
    }
  }

  private buildHTML(): string {
    return `
      <div class="ide-titlebar">
        <div class="ide-titlebar-dots">
          <span class="ide-dot ide-dot-red"></span>
          <span class="ide-dot ide-dot-yellow"></span>
          <span class="ide-dot ide-dot-green"></span>
        </div>
        <span class="ide-titlebar-name">main.ts — Work Day Project</span>
        <span class="ide-titlebar-spacer"></span>
      </div>
      <div class="ide-menubar">
        <span class="ide-menu-item">File</span>
        <span class="ide-menu-item">Edit</span>
        <span class="ide-menu-item">Selection</span>
        <span class="ide-menu-item">View</span>
        <span class="ide-menu-item">Go</span>
        <span class="ide-menu-item">Run</span>
        <span class="ide-menu-item">Terminal</span>
        <span class="ide-menu-item">Help</span>
      </div>
      <div class="ide-body">
        <div class="ide-activity-bar">
          <span class="ide-activity-icon ide-icon-active">&#9781;</span>
          <span class="ide-activity-icon">&#128269;</span>
          <span class="ide-activity-icon">&#9741;</span>
          <span class="ide-activity-icon">&#128030;</span>
        </div>
        <div class="ide-sidebar">
          <div class="ide-sidebar-header">EXPLORER</div>
          <div class="ide-tree-item ide-tree-open">&#9660; src</div>
          <div class="ide-tree-item ide-tree-indent">&#9654; engine</div>
          <div class="ide-tree-item ide-tree-indent">&#9654; games</div>
          <div class="ide-tree-item ide-tree-indent">&#9654; skins</div>
          <div class="ide-tree-item ide-tree-indent ide-tree-active">&#128196; main.ts</div>
        </div>
        <div class="ide-editor-area">
          <div class="ide-tab-bar">
            <span class="ide-tab ide-tab-active">main.ts &#10005;</span>
            <span class="ide-tab">snakeGame.ts</span>
            <span class="ide-tab">typingGame.ts</span>
          </div>
          <div class="ide-timer-bar">
            <div class="ide-timer-bar-fill"></div>
          </div>
          <div class="ide-editor">
            <div class="ide-scroll-area">
              <div class="ide-gutter"></div>
              <div class="ide-lines"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="ide-statusbar">
        <span class="ide-status-left">
          <span class="ide-branch">&#9898; main</span>
          <span class="ide-stat-diff">Easy</span>
        </span>
        <span class="ide-status-right">
          <span class="ide-stat-wpm">WPM: 0</span>
          <span class="ide-stat-acc">Acc: 100%</span>
          <span class="ide-stat-score">Score: 0</span>
          <span class="ide-stat-timer">⏱ 60s</span>
          <span>TypeScript</span>
          <span class="ide-stat-hint">Esc: Switch game</span>
        </span>
      </div>
      <div class="ide-gameover" style="display:none">
        <div class="ide-gameover-box">
          <h2>Time's Up</h2>
          <p class="ide-gameover-score">Score: 0</p>
          <p class="ide-gameover-wpm">Peak WPM: 0</p>
          <p class="ide-gameover-hint">Press <strong>Enter</strong> to play again &nbsp;·&nbsp; <strong>Esc</strong> to switch game</p>
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
      html, body { margin: 0; padding: 0; overflow: hidden; }

      #ide-skin {
        font-family: ${EDITOR_FONT};
        font-size: 13px;
        display: flex;
        flex-direction: column;
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: #1e1e1e;
        color: #d4d4d4;
        overflow: hidden;
        user-select: none;
        outline: none;
      }

      /* ── Title bar ──────────────────────────────────────── */
      .ide-titlebar {
        background: #3c3c3c;
        display: flex;
        align-items: center;
        height: 28px;
        padding: 0 12px;
        flex-shrink: 0;
        gap: 8px;
      }
      .ide-titlebar-dots { display: flex; gap: 6px; }
      .ide-dot {
        width: 12px; height: 12px;
        border-radius: 50%;
        display: inline-block;
      }
      .ide-dot-red    { background: #ff5f57; }
      .ide-dot-yellow { background: #febc2e; }
      .ide-dot-green  { background: #28c840; }
      .ide-titlebar-name {
        flex: 1;
        text-align: center;
        font-size: 12px;
        color: #cccccc;
      }
      .ide-titlebar-spacer { flex: 0 0 60px; }

      /* ── Menu bar ───────────────────────────────────────── */
      .ide-menubar {
        background: #2d2d2d;
        display: flex;
        gap: 0;
        height: 22px;
        align-items: center;
        flex-shrink: 0;
        font-size: 12px;
      }
      .ide-menu-item {
        padding: 2px 10px;
        color: #cccccc;
        cursor: default;
      }
      .ide-menu-item:hover { background: #444; }

      /* ── Body ───────────────────────────────────────────── */
      .ide-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      /* ── Activity bar ───────────────────────────────────── */
      .ide-activity-bar {
        background: #333333;
        width: 46px;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 8px;
        gap: 12px;
        flex-shrink: 0;
      }
      .ide-activity-icon {
        font-size: 18px;
        color: #858585;
        cursor: default;
        width: 34px;
        text-align: center;
        padding: 4px 0;
        border-radius: 4px;
      }
      .ide-icon-active {
        color: #ffffff;
        border-left: 2px solid #007acc;
      }

      /* ── Sidebar ────────────────────────────────────────── */
      .ide-sidebar {
        background: #252526;
        width: 160px;
        flex-shrink: 0;
        overflow: hidden;
        font-size: 12px;
      }
      .ide-sidebar-header {
        color: #bbbbbb;
        padding: 8px 12px 4px;
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 0.05em;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      .ide-tree-item {
        padding: 3px 12px;
        color: #cccccc;
        cursor: default;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 12px;
      }
      .ide-tree-indent { padding-left: 24px; }
      .ide-tree-active { background: #094771; color: #ffffff; }
      .ide-tree-open   { color: #e8e8e8; }

      /* ── Editor area ────────────────────────────────────── */
      .ide-editor-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .ide-tab-bar {
        background: #2d2d2d;
        display: flex;
        height: 35px;
        align-items: flex-end;
        flex-shrink: 0;
      }
      .ide-tab {
        padding: 8px 14px;
        font-size: 12px;
        color: #999;
        cursor: default;
        border-top: 1px solid transparent;
        background: #2d2d2d;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      .ide-tab-active {
        background: #1e1e1e;
        color: #ffffff;
        border-top: 1px solid #007acc;
      }

      /* ── Timer progress bar ─────────────────────────────── */
      .ide-timer-bar {
        height: 3px;
        background: #333;
        flex-shrink: 0;
      }
      .ide-timer-bar-fill {
        height: 100%;
        width: 100%;
        background: #4ec9b0;
        transition: width 0.1s linear, background 0.3s;
      }

      /* ── Editor ─────────────────────────────────────────── */
      .ide-editor {
        flex: 1;
        display: flex;
        overflow: hidden;
        background: #1e1e1e;
      }
      .ide-scroll-area {
        display: flex;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding-top: 24px;
        padding-bottom: 40px;
        scroll-behavior: smooth;
      }
      .ide-scroll-area::-webkit-scrollbar { width: 8px; }
      .ide-scroll-area::-webkit-scrollbar-track { background: #1e1e1e; }
      .ide-scroll-area::-webkit-scrollbar-thumb { background: #424242; border-radius: 4px; }
      .ide-gutter {
        background: #1e1e1e;
        color: #858585;
        font-size: 13px;
        line-height: 22px;
        text-align: right;
        padding-right: 12px;
        padding-left: 16px;
        flex-shrink: 0;
        user-select: none;
      }
      .ide-line-num { height: 22px; }
      .ide-line-active { color: #c6c6c6; }
      .ide-lines {
        flex: 1;
        font-size: 13px;
        line-height: 22px;
        overflow: hidden;
      }
      .ide-line {
        height: 22px;
        white-space: pre;
      }
      .ide-line-active { background: #2a2d2e; }
      .ide-comment { color: #6a9955; }
      .ide-completed-line { color: #4ec9b0; opacity: 0.55; }

      /* ── Typed-character states ─────────────────────────── */
      .ide-char-correct { color: #4ec9b0; }
      .ide-char-pending { color: #9cdcfe; }
      .ide-char-cursor  {
        color: #1e1e1e;
        background: #aeafad;
        border-radius: 2px;
        animation: ide-blink 1s step-end infinite;
      }
      @keyframes ide-blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }

      /* ── Status bar ─────────────────────────────────────── */
      .ide-statusbar {
        background: #007acc;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 22px;
        padding: 0 10px;
        font-size: 11px;
        flex-shrink: 0;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      .ide-status-left, .ide-status-right {
        display: flex;
        gap: 14px;
        align-items: center;
      }
      .ide-branch { opacity: 0.9; }
      .ide-stat-hint { opacity: 0.65; font-style: italic; }

      /* ── Game-over overlay ──────────────────────────────── */
      .ide-gameover {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        align-items: center;
        justify-content: center;
      }
      .ide-gameover-box {
        background: #252526;
        padding: 32px 48px;
        border: 1px solid #007acc;
        border-radius: 6px;
        text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        color: #d4d4d4;
      }
      .ide-gameover-box h2 {
        margin: 0 0 14px;
        color: #e06c75;
        font-size: 22px;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      .ide-gameover-score,
      .ide-gameover-wpm {
        font-size: 15px;
        margin: 4px 0;
        font-weight: bold;
      }
      .ide-gameover-hint {
        font-size: 12px;
        color: #858585;
        margin-top: 12px;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
    `
    document.head.appendChild(style)
  }
}
