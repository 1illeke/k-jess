<img src="apps/web/public/kjess.png" alt="Web Game Header" width="100%" />

<div align="center">

# K/Jess

An online real‑time multiplayer game built with React (Vite) and Node.js (Express + Socket.IO). Designed for smooth 60 FPS DOM animations, accessible over the internet, and easy to run locally.

<br/>

<!-- Tech badges -->
<a href="https://nodejs.org/"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white"></a>
<a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=0A0A0A"></a>
<a href="https://vitejs.dev/"><img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white"></a>
<a href="https://expressjs.com/"><img alt="Express" src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white"></a>
<a href="https://socket.io/"><img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white"></a>
<a href="https://vercel.com/"><img alt="Vercel" src="https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white"></a>
<a href="https://railway.app/"><img alt="Railway" src="https://img.shields.io/badge/Backend-Railway-0B0D0E?logo=railway&logoColor=white"></a>
<a href="#"><img alt="Monorepo" src="https://img.shields.io/badge/Workspace-Monorepo-7849ff?logo=npm&logoColor=white"></a>

<br/>

<a href="https://k-jess.lilleke.eu"><img alt="Play Online" src="https://img.shields.io/badge/Play%20Online-k--jess.lilleke.eu-1f883d?logo=google-chrome&logoColor=white"></a>

</div>

---

**[ WARNING ]** This project is still in active development. Some features may not work yet or have not been added.

## Table of Contents

- What is this?
- Tech Stack
- How it works
- Project constraints
- Local development
- Environment variables
- Project structure
- Scripts

## What is this?

This is a Multiplayer Real‑Time Strategy (MP‑RTS) chess game where speed and strategy collide. Unlike traditional turn‑based chess, K/Jess allows all players to move simultaneously. Pieces follow normal chess rules but actions are gated by cooldowns, rewarding fast thinking and precise execution. Play with 2–4 players in chaotic real‑time battles.

## Tech Stack

- React 19 + Vite
- Node.js 18+, Express 4
- Socket.IO 4 (real‑time transport)
- Monorepo via npm workspaces
- Vercel (frontend) + Railway (backend)

## How it works

- Lobby creation and joining are handled via Socket.IO namespaces/rooms.
- The backend (`apps/server`) maintains lobby state, validates actions, and broadcasts updates.
- The frontend (`apps/web`) renders everything with DOM elements and subscribes to server events.
- Real‑time updates propagate instantly to all connected clients.
- Animations and game loops use `requestAnimationFrame` for smooth 60 FPS.

### Key socket events

Client → Server
- `lobby:create` – Create a new lobby
- `lobby:join` – Join an existing lobby
- `lobby:leave` – Leave the current lobby
- `lobby:updateSettings` – Host‑only settings updates
- `lobby:startGame` – Host starts the game
- `lobby:end` – Host ends the lobby

Server → Client
- `lobby:state` – Full lobby state snapshot
- `lobby:settingsUpdated` – Settings changed
- `lobby:started` – Game started
- `lobby:ended` – Lobby ended
- `lobby:error` – Error messages

## Project constraints (design guidelines)

- DOM elements only for rendering; canvas is not used.
- 2–4 players, real‑time (not turn‑based) with equal playable characters.
- Smooth 60 FPS animations using `requestAnimationFrame`.
- In‑game menu: pause/resume/quit, scoring with real‑time updates, and game timer.
- Keyboard controls and sound effects.
- Accessible over the internet; players can join via a URL and unique name.

## Local development

### Prerequisites
- Node.js 18+
- npm 7+

### Install

```bash
git clone <repo-url>
cd web-game
npm install
```

### Configure environment

Create the following files with your local values:

Frontend `apps/web/.env`
```env
VITE_SOCKET_URL=http://localhost:4000
```

Backend `apps/server/.env`
```env
PORT=4000
CORS_ORIGINS=http://localhost:5173
```

### Run

Open two terminals:

Terminal 1 (backend – port 4000)
```bash
npm run server
```

Terminal 2 (frontend – port 5173)
```bash
npm run dev
```

Then visit `http://localhost:5173` and open multiple browser windows to test multiplayer.
- Note: Multiplayer on the same device and same browser may not work correctly. Either use different browsers or incognito tabs.

## Project structure

```
web-game/
├── apps/
│   ├── web/                  # React frontend (Vite)
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── vercel.json
│   └── server/               # Express + Socket.IO backend
│       ├── services/
│       ├── constants/
│       ├── server.js
│       └── package.json
├── package.json              # Root npm workspace config
└── README.md
```

## Environment variables

Frontend (`apps/web/.env`)
```env
VITE_SOCKET_URL=http://localhost:4000
```

Backend (`apps/server/.env`)
```env
PORT=4000
CORS_ORIGINS=http://localhost:5173
```

## Scripts

Root level
```bash
npm run dev        # Start frontend (apps/web)
npm run server     # Start backend (apps/server)
npm run build      # Build frontend for production
```

Workspace specific
```bash
npm run dev --workspace=apps/web
npm run start --workspace=apps/server
```

---

## Gameplay overview

- Real-time chess with cooldowns instead of turns
- Supports 2, 3, and 4 players
- Colors/orientations are stable across reconnects and refreshes
- Host remains the host across refresh; host can start/end the game

### Controls

- Mouse: click a piece to select; click a highlighted square to move
- Enter (global):
  - If the chat is not focused: focuses the chat input
  - If the chat is focused: sends the message
- Music controls (global):
  - J: previous track
  - K: play/pause
  - L: next track
- In-UI buttons: Pause, Quit, Feedback, Mute

### Lobby and reconnect behavior

- Player identity is stable per browser tab via `sessionStorage` (`playerId`)
- Quick reconnect: if you disconnect and reconnect within 30s, the client re-joins automatically
- Seat/orientation is preserved across reconnects and refreshes
- Host is preserved by `hostPlayerId`; refreshing does not reshuffle host
- If a game ends (checkmate, stalemate, insufficient material, or only one team remains):
  - The server stops and deletes the game timer
  - The server cleans up the engine and chat for that lobby
  - Re-entering the ended game shows “This game has ended” with a Back Home button

### Server endpoints (dev / admin)

- Health check: `GET /health`
- Online count: `GET /api/online-count`
- Admin – list lobbies: `GET /api/admin/lobbies`
- Admin – terminate lobby: `DELETE /api/admin/lobbies/:code`

### Networking and security notes

- All move validations run on the server
- Server derives a player’s orientation from the stored mapping; client-sent orientation is ignored
- Moves/promotion are only applied for the player’s assigned seat

### Troubleshooting

- Can’t join a lobby from the same browser window with two tabs:
  - Use different browsers or an incognito/private window per player
- Reconnect didn’t work after a long break:
  - Auto-rejoin only attempts for ~30 seconds after disconnect
- Timer didn’t stop on game end:
  - The server now force-stops timers and cleans up on game over; restart both processes if you’re on an older build

### Dev tips

- Use `start-dev.bat` to run both services on Windows (optional)
- Update CORS origins in `apps/server/.env` if testing from a different dev URL

### Project notes

- Rendering uses DOM elements for portability; no canvas/WebGL
- The 3- and 4-player boards use a cross layout on a 14×14 grid
- Engines:
  - `ChessEngine` for 1v1
  - `KISSEngine` for 3/4 players
- Game over signaling includes both `winner` (array) and `loser` (single orientation) so clients can reliably display win/loss