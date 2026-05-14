export function createSystemClock() {
  let idCounter = 0;
  return {
    nowIso() {
      return new Date().toISOString();
    },
    nextId(prefix) {
      idCounter += 1;
      return `${prefix}_${Date.now()}_${String(idCounter).padStart(4, '0')}`;
    }
  };
}

export function createDeterministicClock({ startIso = '2000-01-01T00:00:00.000Z', stepMs = 1000 } = {}) {
  let timestamp = Date.parse(startIso);
  let idCounter = 0;

  return {
    nowIso() {
      const value = new Date(timestamp).toISOString();
      timestamp += stepMs;
      return value;
    },
    nextId(prefix) {
      idCounter += 1;
      return `${prefix}_${String(idCounter).padStart(4, '0')}`;
    }
  };
}
