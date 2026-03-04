import { GameLoop } from './engine/gameLoop'
import { InputRouter, GameInput } from './engine/inputRouter'
import { StateMachine, GameStatus } from './engine/stateMachine'
import { ScoreSystem } from './engine/scoreSystem'
import { SnakeGame } from './games/snakeGame'
import { TypingGame } from './games/typingGame'
import { SolitaireGame } from './games/solitaireGame'
import { ExcelSkin } from './skins/excelSkin'
import { IdeSkin } from './skins/ideSkin'
import { JiraSkin } from './skins/jiraSkin'

// ── Game selector ─────────────────────────────────────────────────────────────

const SELECTOR_ID = 'game-selector'

function showSelector(): void {
  const root = document.getElementById('app') ?? document.body

  const div = document.createElement('div')
  div.id = SELECTOR_ID
  div.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; background: #1e1e1e; }
      #game-selector {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: 'Bahnschrift', 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
        background: #1e1e1e;
        color: #d4d4d4;
        gap: 32px;
      }
      #game-selector h1 { font-size: 48px; margin: 0 0 8px; color: #4ec9b0; letter-spacing: 0.04em; }
      #game-selector p  { margin: 0; font-size: 18px; color: #858585; }
      .gs-cards { display: flex; gap: 40px; margin-top: 24px; }
      .gs-card {
        background: #252526;
        border: 1px solid #3c3c3c;
        border-radius: 10px;
        padding: 40px 56px;
        text-align: center;
        cursor: pointer;
        transition: border-color .15s, transform .1s;
        min-width: 280px;
      }
      .gs-card:hover { border-color: #007acc; transform: translateY(-4px); }
      .gs-card h2 { margin: 0 0 12px; font-size: 26px; color: #9cdcfe; }
      .gs-card p  { margin: 0; font-size: 15px; color: #858585; }
    </style>
    <h1>Workday Boredom Buster</h1>
    <p>Choose your disguise</p>
    <div class="gs-cards">
      <div class="gs-card" id="gs-snake">
        <h2>Excel Snake</h2>
        <p>Arrow keys · spreadsheet skin</p>
      </div>
      <div class="gs-card" id="gs-typing">
        <h2>IDE Typing Sprint</h2>
        <p>Type code · difficulty ramp</p>
      </div>
      <div class="gs-card" id="gs-solitaire">
        <h2>Jira Solitaire</h2>
        <p>Click cards · Kanban board skin</p>
      </div>
    </div>
  `
  root.appendChild(div)

  div.querySelector('#gs-snake')!.addEventListener('click', () => {
    div.remove()
    startSnake()
  })
  div.querySelector('#gs-typing')!.addEventListener('click', () => {
    div.remove()
    startTyping()
  })
  div.querySelector('#gs-solitaire')!.addEventListener('click', () => {
    div.remove()
    startSolitaire()
  })
}

// ── Snake (Excel skin) ────────────────────────────────────────────────────────

function startSnake(): void {
  const stateMachine = new StateMachine()
  const scoreSystem = new ScoreSystem()
  const snakeGame = new SnakeGame()
  const excelSkin = new ExcelSkin()

  excelSkin.initialize()

  let lastScore = 0

  function teardown(): void {
    loop.stop()
    inputRouter.unbind()
    excelSkin.destroy()
    showSelector()
  }

  const loop = new GameLoop((_delta: number) => {
    if (stateMachine.state !== GameStatus.Running) return

    snakeGame.tick()

    // Skip render when nothing has changed (performance optimization)
    if (!snakeGame.consumeDirty()) return

    const state = snakeGame.getState()

    const delta = state.score - lastScore
    if (delta > 0) {
      scoreSystem.add(delta)
      lastScore = state.score
    }

    excelSkin.render({ ...state, highScore: scoreSystem.highScore })

    if (state.status === 'gameover') {
      stateMachine.transition(GameStatus.GameOver)
    }
  })

  const inputRouter = new InputRouter()
  inputRouter.bind((input: GameInput, char?: string) => {
    if (input === GameInput.Escape) {
      teardown()
      return
    }
    if (input === GameInput.TypeCharacter && (char === 'p' || char === 'P')) {
      excelSkin.toggleBossMode()
      return
    }
    if (stateMachine.state === GameStatus.Running) {
      if (input === GameInput.Up) snakeGame.setDirection('Up')
      else if (input === GameInput.Down) snakeGame.setDirection('Down')
      else if (input === GameInput.Left) snakeGame.setDirection('Left')
      else if (input === GameInput.Right) snakeGame.setDirection('Right')
    } else if (stateMachine.state === GameStatus.GameOver && input === GameInput.Confirm) {
      snakeGame.reset()
      stateMachine.transition(GameStatus.Idle)
      stateMachine.transition(GameStatus.Running)
      loop.start()
    }
  })

  stateMachine.onStateChange((_from, to) => {
    if (to === GameStatus.GameOver) {
      loop.stop()
      excelSkin.render({ ...snakeGame.getState(), highScore: scoreSystem.highScore })
    }
    if (to === GameStatus.Idle) {
      scoreSystem.reset()
      lastScore = 0
    }
  })

  stateMachine.transition(GameStatus.Running)
  loop.start()
}

// ── Typing Sprint (IDE skin) ──────────────────────────────────────────────────

function startTyping(): void {
  const stateMachine = new StateMachine()
  const typingGame = new TypingGame()
  const ideSkin = new IdeSkin()

  ideSkin.initialize()

  function teardown(): void {
    loop.stop()
    inputRouter.unbind()
    ideSkin.destroy()
    showSelector()
  }

  const loop = new GameLoop((delta: number) => {
    if (stateMachine.state !== GameStatus.Running) return

    typingGame.tick(delta)

    const state = typingGame.getState()
    ideSkin.render(state as unknown as import('./skins/Skin').GameState)

    if (state.status === 'gameover') {
      stateMachine.transition(GameStatus.GameOver)
    }
  })

  const inputRouter = new InputRouter()
  inputRouter.bind((input: GameInput, char?: string) => {
    if (input === GameInput.Escape) {
      teardown()
      return
    }
    if (stateMachine.state === GameStatus.Running) {
      if (input === GameInput.TypeCharacter && char !== undefined) {
        typingGame.type(char)
      }
    } else if (stateMachine.state === GameStatus.GameOver && input === GameInput.Confirm) {
      typingGame.reset()
      stateMachine.transition(GameStatus.Idle)
      stateMachine.transition(GameStatus.Running)
      loop.start()
    }
  })

  stateMachine.onStateChange((_from, to) => {
    if (to === GameStatus.GameOver) {
      loop.stop()
      // Final render so the overlay appears immediately
      ideSkin.render(typingGame.getState() as unknown as import('./skins/Skin').GameState)
    }
  })

  stateMachine.transition(GameStatus.Running)
  loop.start()
}

// ── Jira Solitaire ────────────────────────────────────────────────────────────

function startSolitaire(): void {
  const game = new SolitaireGame()
  const skin = new JiraSkin()

  skin.initialize()

  function render(): void {
    skin.render(game.getState() as unknown as import('./skins/Skin').GameState)
  }

  skin.setActionHandler((pile, pileIndex, cardIndex, isDouble) => {
    if (isDouble) {
      game.doubleClick(pile, pileIndex)
    } else {
      game.click(pile, pileIndex, cardIndex)
    }
    render()
  })

  skin.setExitHandler(() => {
    skin.destroy()
    showSelector()
  })

  skin.setRestartHandler(() => {
    game.reset()
    render()
  })

  render()
}

// ── Boot ──────────────────────────────────────────────────────────────────────

showSelector()

