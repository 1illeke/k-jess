const GAMES = {}; // { [lobbyCode]: { lobbyCode, settings, players, startedAt } }

export function createGameSession(lobbyCode, settings = {}, players = []) {
  const session = {
    lobbyCode,
    settings,
    players,
    startedAt: Date.now()
  };
  GAMES[lobbyCode] = session;
  return session;
}

export function getGameSession(lobbyCode) {
  return GAMES[lobbyCode];
}

export function removeGameSession(lobbyCode) {
  if (GAMES[lobbyCode]) {
    delete GAMES[lobbyCode];
    return true;
  }
  return false;
}