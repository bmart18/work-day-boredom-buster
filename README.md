# Workday Boredom Buster

Workday Boredom Buster is a browser-based game engine that disguises interactive gameplay inside realistic professional software environments.

The application renders convincing productivity interfaces (spreadsheets, IDEs, technical consoles, etc.), while entirely unrelated game mechanics operate beneath the surface.

The illusion is visual. The mechanics are real.

The application runs fully client-side with no backend, no persistence, and no telemetry.

---

## Project Vision

Workday Boredom Buster aims to:

- Render highly convincing professional UI environments  
- Host real-time game loops inside those environments  
- Allow gameplay mechanics that are unrelated to the visual metaphor  
- Support multiple skins powered by a shared deterministic engine  
- Remain lightweight and statically deployable  

---

## High-Level Architecture

/src  
main.ts  
engine/  
 gameLoop.ts  
 stateMachine.ts  
 inputRouter.ts  
 scoreSystem.ts  
games/  
 snakeGame.ts  
 typingGame.ts  
skins/  
 excelSkin.ts  
 ideSkin.ts  
 matlabSkin.ts  
ui/  
 renderer.ts  
utils/  
 random.ts  
 gridMath.ts  

---

## Core System Layers

### 1. Game Engine

Responsible for:

- Tick loop (requestAnimationFrame)  
- Time delta management  
- Game state transitions  
- Collision detection  
- Scoring  
- Difficulty scaling  

The engine is completely UI-agnostic.

---

### 2. Skin Interface Contract

Every skin must implement:

```ts
interface Skin {
  initialize(): void
  render(gameState: GameState): void
  bindInput(callback: InputEventHandler): void
  destroy(): void
}
```

The skin only knows how to visually render state.  
It does not compute it.

---

### 3. Input Routing

Keyboard and mouse events are intercepted and translated into:

```ts
enum GameInput {
  Up,
  Down,
  Left,
  Right,
  Confirm,
  TypeCharacter,
}
```

This allows:

- Arrow keys → Snake movement  
- Typing letters → Word speed test  
- Clicking cells → Action trigger  

---

## Example First Game Concepts

### Excel Snake

- Spreadsheet grid rendered as realistic Excel  
- Snake occupies cell coordinates  
- Cells visually “fill” to simulate movement  
- Fake formulas and headers surround the grid  
- Movement controlled via arrow keys  
- Growth + collision logic handled by engine  

### IDE Typing Sprint

- IDE interface with line numbers  
- Random code snippets generated  
- Player must type code accurately  
- Syntax highlighting illusion  
- Score based on WPM + accuracy  

---

## Roadmap

### Phase 0 — Foundation
- [x] Create README  

### Phase 1 — Project Initialization
- [x] Initialize Vite + TypeScript  
- [x] Implement base game loop  
- [x] Define Skin interface contract  

### Phase 2 — Engine Core
- [x] Build deterministic tick system  
- [x] Implement global state machine  
- [x] Create input router  
- [x] Implement scoring framework  

### Phase 3 — First Game Implementation
- [x] Implement Snake logic (grid-based)  
- [x] Build Excel skin grid renderer  
- [x] Bind arrow input to movement  
- [x] Add collision + scoring  

### Phase 4 — Second Game
- [x] Implement typing game engine  
- [x] Build IDE-style skin  
- [x] Add difficulty ramp  

### Phase 5 — Polish
- [x] Skin switching system  
- [x] Visual realism improvements  
- [x] Performance optimization  
- [x] Static deployment  

---

## Deployment Plan

Static deployment via:

- GitHub Pages  
- Netlify  
- Vercel  

No server required.

---

## License

Copyright (c) 2026 Brad Martin

All rights reserved.

This source code and all associated files are the exclusive property of the author.

No permission is granted to use, copy, modify, merge, publish, distribute,
sublicense, or sell copies of this software without explicit written permission
from the author.

Unauthorized use of this code is strictly prohibited.
