import { GameLoop } from './engine/gameLoop'
import { InputRouter } from './engine/inputRouter'
import { StateMachine, GameStatus } from './engine/stateMachine'
import { ScoreSystem } from './engine/scoreSystem'

const stateMachine = new StateMachine()
const scoreSystem = new ScoreSystem()

const loop = new GameLoop((_delta: number) => {
  // Game tick: engine and skin updates will be wired here in subsequent phases
})

const inputRouter = new InputRouter()
inputRouter.bind(() => {
  // Input events will be routed to the active game in subsequent phases
})

stateMachine.onStateChange((_from, to) => {
  if (to === GameStatus.GameOver) {
    loop.stop()
  }
  if (to === GameStatus.Idle) {
    scoreSystem.reset()
  }
})

loop.start()

