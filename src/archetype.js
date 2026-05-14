import { ARCHETYPES } from './constants.js';
import { createSystemClock } from './clock.js';

const SYMBOL_ARCHETYPE_HINTS = Object.freeze({
  light: { Creator: 0.35, Seeker: 0.15 },
  awakening: { Creator: 0.25, Child: 0.15 },
  mirror: { Shadow: 0.25, Sage: 0.1 },
  portal: { Seeker: 0.35, Hero: 0.15 },
  threshold: { Seeker: 0.2, Sage: 0.1 },
  silence: { Sage: 0.15, Anima: 0.1 },
  fog: { Shadow: 0.2, Anima: 0.1 }
});

export class ArchetypeState {
  constructor(snapshot = {}, { clock = createSystemClock() } = {}) {
    this.clock = clock;
    this.archetypeVector = Object.fromEntries(
      ARCHETYPES.map((name) => [name, snapshot.archetype_vector?.[name] ?? 0])
    );
    this.coherence = snapshot.coherence ?? 0;
    this.vibeState = snapshot.vibe_state ?? 'silent';
    this.symbolHits = { ...(snapshot.symbol_hits ?? {}) };
    this.speechEvents = [...(snapshot.speech_events ?? [])];
    this.actionEvents = [...(snapshot.action_events ?? [])];
    this.roomConfigSnapshot = snapshot.room_config_snapshot ?? null;
  }

  recordSpeech(text, symbols = []) {
    const event = {
      text,
      symbols,
      timestamp: this.clock.nowIso()
    };
    this.speechEvents.push(event);
    this.#recordSymbols(symbols);
    this.#recomputeCoherence();
    return event;
  }

  recordAction(name, archetypes = [], symbols = []) {
    const event = {
      name,
      archetypes,
      symbols,
      timestamp: this.clock.nowIso()
    };
    this.actionEvents.push(event);

    archetypes.forEach((archetype, index) => {
      // The first tag is treated as the primary current. This mirrors a likely
      // UE DataAsset setup where designers rank symbolic meaning by order.
      this.#addArchetype(archetype, index === 0 ? 1.2 : 0.7);
    });

    this.#recordSymbols(symbols);
    this.#recomputeCoherence();
    return event;
  }

  dominantArchetype() {
    return ARCHETYPES.reduce((best, archetype) => {
      if (this.archetypeVector[archetype] > this.archetypeVector[best]) {
        return archetype;
      }
      return best;
    }, ARCHETYPES[0]);
  }

  recentSymbols(limit = 8) {
    return Object.entries(this.symbolHits)
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([symbol]) => symbol);
  }

  recentActions(limit = 8) {
    return this.actionEvents.slice(-limit).map((event) => event.name);
  }

  bindRoomSnapshot(roomConfigSnapshot) {
    this.roomConfigSnapshot = roomConfigSnapshot;
  }

  snapshot() {
    return {
      archetype_vector: { ...this.archetypeVector },
      coherence: this.coherence,
      vibe_state: this.vibeState,
      symbol_hits: { ...this.symbolHits },
      speech_events: [...this.speechEvents],
      action_events: [...this.actionEvents],
      room_config_snapshot: this.roomConfigSnapshot
    };
  }

  #recordSymbols(symbols) {
    for (const symbol of symbols) {
      this.symbolHits[symbol] = (this.symbolHits[symbol] ?? 0) + 1;
      const hints = SYMBOL_ARCHETYPE_HINTS[symbol] ?? {};
      for (const [archetype, amount] of Object.entries(hints)) {
        this.#addArchetype(archetype, amount);
      }
    }
  }

  #addArchetype(archetype, amount) {
    if (!(archetype in this.archetypeVector)) {
      return;
    }
    this.archetypeVector[archetype] += amount;
  }

  #recomputeCoherence() {
    const values = Object.values(this.archetypeVector);
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      this.coherence = 0;
      return;
    }

    const max = Math.max(...values);
    const active = values.filter((value) => value > 0).length || 1;
    // High coherence means one current is carrying the room. Broadly scattered
    // symbolism lowers it without ever making it feel like a hard failure.
    this.coherence = Number(Math.min(1, (max / total) * (1 + 1 / active)).toFixed(3));
  }
}
