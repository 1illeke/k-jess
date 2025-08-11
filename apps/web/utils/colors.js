const PLAYER_COLORS = ['White', 'Black', 'Orange', 'Red'];

export function assignPlayerColors(players, randomColors = false) {
  if (!players || players.length === 0) {
    return [];
  }

  let colorOrder = [...PLAYER_COLORS];
  
  if (randomColors) {
    colorOrder = shuffleArray([...PLAYER_COLORS]);
  }

  return players.map((player, index) => ({
    ...player,
    color: colorOrder[index % colorOrder.length]
  }));
}

// For persistent color assignments using stored color map
export function applyStoredColors(players, storedColorMap = {}) {
  if (!players || players.length === 0) {
    return [];
  }

  return players.map(player => ({
    ...player,
    color: storedColorMap[player.playerId] || storedColorMap[player.id] || 'White'
  }));
}

// Generate initial color assignments for a lobby
export function generateInitialColorAssignments(playerIds, randomColors = false) {
  if (!playerIds || playerIds.length === 0) {
    return {};
  }

  let colorOrder = [...PLAYER_COLORS];
  if (randomColors) {
    colorOrder = shuffleArray([...PLAYER_COLORS]);
  }

  const colorMap = {};
  playerIds.forEach((playerId, index) => {
    colorMap[playerId] = colorOrder[index % colorOrder.length];
  });
  
  return colorMap;
}

export function getPlayerColor(playerId, players) {
  const player = players.find(p => p.id === playerId || p.playerId === playerId);
  return player?.color || null;
}

export function getColorByPosition(position, randomColors = false) {
  if (position < 0 || position >= PLAYER_COLORS.length) {
    return null;
  }

  if (randomColors) {
    const shuffled = shuffleArray([...PLAYER_COLORS]);
    return shuffled[position];
  }

  return PLAYER_COLORS[position];
}

// Assign color to a new player based on existing assignments
export function assignColorToNewPlayer(playerId, existingColorMap, randomColors = false) {
  const usedColors = Object.values(existingColorMap);
  let availableColors = PLAYER_COLORS.filter(color => !usedColors.includes(color));
  
  if (availableColors.length === 0) {
    // All colors used, cycle through again
    availableColors = [...PLAYER_COLORS];
  }
  
  if (randomColors && availableColors.length > 1) {
    const randomIndex = Math.floor(Math.random() * availableColors.length);
    return availableColors[randomIndex];
  }
  
  return availableColors[0];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export { PLAYER_COLORS };