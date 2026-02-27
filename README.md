# Workday Boredom Buster

Workday Boredom Buster is a browser-based interactive application disguised as legitimate productivity software. Users appear to be working inside professional environments (spreadsheets, IDEs, technical consoles, etc.) while actually engaging with a lightweight, client-side game.

The application runs entirely in the browser and requires no backend infrastructure, no database, and no persistent storage.

---

## Project Vision

The goal of Workday Boredom Buster is to:

- Simulate realistic professional software environments
- Respond to real user typing and clicking
- Provide hidden game mechanics beneath convincing “work” interfaces
- Remain lightweight and statically deployable
- Support multiple visual skins with shared core logic

---

## Core Principles

- 100% client-side
- No backend services
- No user tracking
- No data persistence
- Modular architecture
- Clean separation between engine logic and UI skins
- AI-friendly code structure

---

## Proposed Tech Stack

- TypeScript
- Vite
- Modular CSS
- No frontend frameworks (no React, Vue, etc.)
- Static hosting deployment

---

## High-Level Architecture
/src
main.ts
engine/
stateMachine.ts
interactionEngine.ts
skins/
excelSkin.ts
matlabSkin.ts
ideSkin.ts
ui/
renderer.ts
utils/
random.ts


---

## Roadmap

### Phase 0 — Foundation
- [x] Create README

### Phase 1 — Project Initialization
- [ ] Initialize Vite + TypeScript project
- [ ] Configure project folder structure
- [ ] Establish build configuration

### Phase 2 — Core Engine
- [ ] Implement global state machine
- [ ] Build interaction engine
- [ ] Define skin interface contract

### Phase 3 — Initial Skins
- [ ] Excel-style interface skin
- [ ] IDE-style interface skin
- [ ] MATLAB-style console skin

### Phase 4 — Game Mechanics Layer
- [ ] Hidden scoring system
- [ ] Dynamic event generation
- [ ] Interaction feedback engine

### Phase 5 — Polish & Deployment
- [ ] Skin switching system
- [ ] Performance optimization
- [ ] Final UI refinement
- [ ] Static deployment configuration

---

## Deployment Plan

The application will be deployed as a static site using:

- GitHub Pages
- Netlify
- Vercel

No server dependencies required.

---

## License

TBD
