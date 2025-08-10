const CHATS = {}; // { [code]: Array<{ playerId: string, playerName: string, text: string, timestamp: number }> }

function ensureRoom(code) {
  if (!CHATS[code]) CHATS[code] = [];
}

export function appendMessage(code, message) {
  ensureRoom(code);
  CHATS[code].push(message);
  return message;
}

export function getMessages(code) {
  ensureRoom(code);
  return CHATS[code];
}