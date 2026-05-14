export class SeededRandom {
  constructor(seed = Date.now()) {
    this.state = SeededRandom.normalizeSeed(seed);
  }

  static normalizeSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) {
      return seed >>> 0;
    }

    const text = String(seed);
    let hash = 2166136261;
    for (const char of text) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  next() {
    // Linear congruential generator: simple, deterministic, and adequate for
    // prototype weighting. UE5 can later replace this with FRandomStream.
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  pickWeighted(items, getWeight) {
    const weights = items.map((item) => Math.max(0, getWeight(item)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);

    if (total <= 0) {
      return { item: items[0], total, roll: 0 };
    }

    const roll = this.next() * total;
    let cursor = 0;
    for (let index = 0; index < items.length; index += 1) {
      cursor += weights[index];
      if (roll <= cursor) {
        return { item: items[index], total, roll };
      }
    }

    return { item: items.at(-1), total, roll };
  }
}
