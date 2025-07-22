# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## How to Run

### 1. Start the Backend (Socket.IO server)

From the project root:

```sh
node backend/server.js
```

The backend will start on port 3001 by default.

### 2. Start the Frontend (Vite + React)

From the project root:

```sh
npm run dev
```

The frontend will start (usually on port 5173) and connect to the backend for multiplayer and chat.

## Backend Details

The backend code for the K/Jess multiplayer chess game is in the `backend/` folder.

### Structure
- `server.js`: Main entry point for the backend server. Sets up the HTTP and Socket.IO server and loads handlers.
- `gameHandlers.js`: Wires up all socket event logic for game rooms, chat, and player management.
- `gameLogicHandlers.js`: Handles player join/leave and (future) game moves.
- `chatHandlers.js`: Handles chat events.
- `persistence.js`: In-memory store for games and disconnect timers.

### Extending
- Add new event handlers or modularize further by creating new files and importing them in `server.js`.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
