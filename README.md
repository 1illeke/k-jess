# Web Game Monorepo

A multiplayer game application split into frontend (React/Vite) and backend (Express/Socket.IO) for deployment to Vercel and Railway respectively.

## Architecture

- **Frontend** (`/apps/web`): React app deployed to Vercel
- **Backend** (`/apps/server`): Express + Socket.IO server deployed to Railway
- **Monorepo**: npm workspaces for unified development

## Local Development

### Prerequisites
- Node.js 18+ 
- npm 7+

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd web-game
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Frontend
   cp apps/web/.env.example apps/web/.env
   
   # Backend  
   cp apps/server/.env.example apps/server/.env
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1: Start backend (port 4000)
   npm run server
   
   # Terminal 2: Start frontend (port 5173)
   npm run dev
   ```

4. **Test the application:**
   - Open http://localhost:5173
   - Create a lobby and test real-time functionality
   - Open multiple browser windows to test multiplayer features

## Environment Variables

### Frontend (`apps/web/.env`)
```env
VITE_SOCKET_URL=http://localhost:4000
```

### Backend (`apps/server/.env`)
```env
PORT=4000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Deployment

### Vercel (Frontend)

1. **Setup:**
   - Connect your repo to Vercel
   - Set root directory to `apps/web`
   - Framework preset: Vite

2. **Environment Variables:**
   ```
   VITE_SOCKET_URL=https://your-railway-backend.railway.app
   ```

3. **Build Settings:**
   - Build command: `npm run build`
   - Output directory: `dist`

### Railway (Backend)

1. **Setup:**
   - Connect your repo to Railway
   - Set root directory to `apps/server`
   - Runtime: Node.js

2. **Environment Variables:**
   ```
   PORT=(automatically set by Railway)
   CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
   ```

3. **Health Check:**
   - Railway will use `/health` endpoint
   - Returns server status and lobby count

## Features

### Lobby System
- Create/join lobbies with 5-digit codes
- Real-time player presence
- Host controls (settings, game start)
- Auto-reconnection support
- Persistent color assignments

### Socket Events

**Client → Server:**
- `lobby:create` - Create new lobby
- `lobby:join` - Join existing lobby  
- `lobby:leave` - Leave current lobby
- `lobby:updateSettings` - Update lobby settings (host only)
- `lobby:startGame` - Start the game (host only)
- `lobby:end` - End the lobby (host only)

**Server → Client:**
- `lobby:state` - Full lobby state updates
- `lobby:settingsUpdated` - Settings change notifications
- `lobby:started` - Game start notification
- `lobby:ended` - Lobby end notification
- `lobby:error` - Error messages

## Acceptance Tests

### Local Development ✅
- [ ] `npm run dev` starts frontend on port 5173
- [ ] `npm run server` starts backend on port 4000
- [ ] Creating lobby works across browser windows
- [ ] Joining lobby shows real-time updates
- [ ] Player disconnect/reconnect updates presence
- [ ] Empty lobbies are cleaned up
- [ ] Host controls work (settings, start game)

### Production Deployment ✅
- [ ] Frontend connects to Railway WebSocket URL
- [ ] No CORS errors in browser console
- [ ] Lobby creation/joining works in production
- [ ] Railway health check returns 200 status
- [ ] Vercel SPA routing works (refresh on any route)

### Code Quality ✅
- [ ] No changes to existing UI component logic
- [ ] Board components unchanged (`src/components/ui/boards/`)
- [ ] SVG assets preserved exactly
- [ ] Only import paths updated for monorepo structure
- [ ] All socket event names preserved
- [ ] Data shapes consistent with original

## Project Structure

```
web-game/
├── apps/
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── vercel.json
│   └── server/               # Express backend
│       ├── services/
│       ├── constants/
│       ├── server.js
│       └── package.json
├── package.json              # Root workspace config
└── README.md
```

## Scripts

```bash
# Root level commands
npm run dev        # Start frontend development server
npm run server     # Start backend server
npm run build      # Build frontend for production

# Workspace specific
npm run dev --workspace=apps/web
npm run start --workspace=apps/server
```

## Troubleshooting

### Connection Issues
- Verify CORS_ORIGINS includes your frontend URL
- Check Socket.IO transports in browser network tab
- Ensure backend health check responds at `/health`

### Local Development
- Backend must start before frontend for proper connection
- Clear browser localStorage if seeing stale lobby data
- Check both .env files have correct values

### Deployment  
- Verify environment variables are set in both platforms
- Check Railway logs for CORS/connection errors
- Confirm Vercel build uses correct VITE_SOCKET_URL