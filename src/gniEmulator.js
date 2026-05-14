import { normalizeDirective } from './contracts.js';
import { SeededRandom } from './random.js';

const ARCHETYPE_MASK_HINTS = Object.freeze({
  Shadow: 'double',
  Child: 'mirror_child',
  Trickster: 'jester_of_glass',
  Creator: 'weaver',
  Destroyer: 'ash_faced_one',
  Seeker: 'double'
});

export class GniEmulator {
  constructor({ seed = 1 } = {}) {
    this.seed = seed;
  }

  processSessionBundle(bundle) {
    const random = new SeededRandom(`${this.seed}:${bundle.sessionId}:${bundle.dominantArchetype}:${bundle.vibeState}`);
    const selectedId = bundle.selectedDream?.id ?? 'mirror_hall';
    const repeatedSymbols = findRepeated(bundle.recentSymbols ?? []);
    const primarySymbol = repeatedSymbols[0] ?? bundle.recentSymbols?.[0] ?? 'threshold';
    const mask = ARCHETYPE_MASK_HINTS[bundle.dominantArchetype] ?? 'double';
    const tense = bundle.vibeState?.includes('tense') ? 0.18 : 0;

    return normalizeDirective({
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: {
        [selectedId]: 0.25 + random.next() * 0.25
      },
      symbolEchoes: [primarySymbol, ...repeatedSymbols].filter(Boolean),
      maskPressure: {
        [mask]: 0.15 + (bundle.coherence ?? 0) * 0.25
      },
      pacingDelta: {
        intensity: 0.05 + tense + (bundle.coherence ?? 0) * 0.1,
        repetition: repeatedSymbols.length > 0 ? 0.1 : 0,
        silence: bundle.vibeState?.includes('dim') ? -0.05 : 0.02
      }
    });
  }
}

function findRepeated(symbols) {
  const counts = {};
  for (const symbol of symbols) {
    counts[symbol] = (counts[symbol] ?? 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([symbol]) => symbol);
}
