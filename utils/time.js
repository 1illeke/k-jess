export function now() {
  return Date.now();
}

export function toEpochMs(date) {
  return date.getTime();
}

export function fromEpochMs(epochMs) {
  return new Date(epochMs);
}

export function isOlderThan(timestamp, maxAgeMs) {
  return (now() - timestamp) > maxAgeMs;
}