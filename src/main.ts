import { GameLoop } from './engine/gameLoop'
import { InputRouter, GameInput } from './engine/inputRouter'
import { StateMachine, GameStatus } from './engine/stateMachine'
import { ScoreSystem } from './engine/scoreSystem'
import { SnakeGame } from './games/snakeGame'
import { ExcelSkin } from './skins/excelSkin'

const stateMachine = new StateMachine()
const scoreSystem = new ScoreSystem()
const snakeGame = new SnakeGame()
const excelSkin = new ExcelSkin()

excelSkin.initialize()

let lastScore = 0

const loop = new GameLoop((_delta: number) => {
  if (stateMachine.state !== GameStatus.Running) return

  snakeGame.tick()

  const state = snakeGame.getState()

  // Sync score delta into the shared ScoreSystem (for high-score tracking)
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
inputRouter.bind((input: GameInput) => {
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
    // Final render so the overlay appears immediately
    excelSkin.render({ ...snakeGame.getState(), highScore: scoreSystem.highScore })
  }
  if (to === GameStatus.Idle) {
    scoreSystem.reset()
    lastScore = 0
  }
})

stateMachine.transition(GameStatus.Running)
loop.start()

