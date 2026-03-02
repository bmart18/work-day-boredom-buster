import { GameLoop } from './engine/gameLoop'
import { InputRouter } from './engine/inputRouter'

const loop = new GameLoop((_delta: number) => {
  // Game tick: engine and skin updates will be wired here in subsequent phases
})

const inputRouter = new InputRouter()
inputRouter.bind(() => {
  // Input events will be routed to the active game in subsequent phases
})

loop.start()

