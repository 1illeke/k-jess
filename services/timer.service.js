const TIMERS = {}; // { [code]: { isRunning: boolean, startMs: number, elapsedMs: number, intervalId: NodeJS.Timeout | null } }

function ensureTimer(code) {
  if (!TIMERS[code]) {
    TIMERS[code] = { isRunning: false, startMs: 0, elapsedMs: 0, intervalId: null };
  }
  return TIMERS[code];
}

export function startTimer(code, onTick) {
  const timer = ensureTimer(code);
  if (timer.isRunning) return;
  timer.isRunning = true;
  timer.startMs = Date.now();
  if (typeof onTick === 'function') onTick(getElapsedSeconds(code));
  timer.intervalId = setInterval(() => {
    if (typeof onTick === 'function') onTick(getElapsedSeconds(code));
  }, 1000);
}

export function pauseTimer(code) {
  const timer = ensureTimer(code);
  if (!timer.isRunning) return;
  timer.elapsedMs += Date.now() - timer.startMs;
  timer.startMs = 0;
  timer.isRunning = false;
  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

export function resetTimer(code) {
  const timer = ensureTimer(code);
  timer.isRunning = false;
  timer.startMs = 0;
  timer.elapsedMs = 0;
  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

export function getElapsedSeconds(code) {
  const timer = ensureTimer(code);
  const runningMs = timer.isRunning ? Date.now() - timer.startMs : 0;
  const totalMs = timer.elapsedMs + runningMs;
  return Math.floor(totalMs / 1000);
}

export function clearTimer(code) {
  const timer = TIMERS[code];
  if (!timer) return;
  if (timer.intervalId) clearInterval(timer.intervalId);
  delete TIMERS[code];
}