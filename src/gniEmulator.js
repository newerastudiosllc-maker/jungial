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
    const journeyContext = normalizeDreamJourneyContext(bundle.dreamJourneyContext);
    const suppressedSymbols = new Set(journeyContext.replacementRoutes.flatMap((route) => route.suppressedTags));
    const primarySymbol = repeatedSymbols[0] ?? bundle.recentSymbols?.[0] ?? journeyContext.symbolTrail[0] ?? 'threshold';
    const mask = ARCHETYPE_MASK_HINTS[bundle.dominantArchetype] ?? 'double';
    const tense = bundle.vibeState?.includes('tense') ? 0.18 : 0;
    const dreamWeightDeltas = {
      [selectedId]: 0.25 + random.next() * 0.25
    };

    for (const route of journeyContext.replacementRoutes) {
      addWeight(dreamWeightDeltas, route.selectedId, 0.16);
      addWeight(dreamWeightDeltas, route.blockedId, -0.2);
    }
    for (const moduleId of journeyContext.suppressedModuleIds) {
      if (!Object.hasOwn(dreamWeightDeltas, moduleId)) {
        dreamWeightDeltas[moduleId] = -0.12;
      }
    }
    if (journeyContext.fallbackUsed) {
      addWeight(dreamWeightDeltas, selectedId, 0.08);
    }

    return normalizeDirective({
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas,
      symbolEchoes: uniqueStrings([
        primarySymbol,
        ...repeatedSymbols,
        ...journeyContext.symbolTrail,
        ...journeyContext.replacementRoutes.flatMap((route) => route.carriedTags)
      ]).filter((symbol) => !suppressedSymbols.has(normalizeToken(symbol))),
      maskPressure: {
        [mask]: 0.15 + (bundle.coherence ?? 0) * 0.25
      },
      pacingDelta: {
        intensity: 0.05 + tense + (bundle.coherence ?? 0) * 0.1 - (journeyContext.fallbackUsed ? 0.03 : 0),
        repetition: repeatedSymbols.length > 0 || journeyContext.replacementRoutes.length > 0 ? 0.1 : 0,
        silence: (bundle.vibeState?.includes('dim') ? -0.05 : 0.02) + (journeyContext.fallbackUsed ? 0.08 : 0)
      }
    });
  }
}

function normalizeDreamJourneyContext(context = null) {
  return {
    symbolTrail: normalizeSymbolList(context?.symbolTrail),
    suppressedModuleIds: normalizeStringList(context?.suppressedModuleIds),
    replacementRoutes: normalizeReplacementRoutes(context?.replacementRoutes),
    fallbackUsed: Boolean(context?.fallbackUsed)
  };
}

function normalizeReplacementRoutes(routes = []) {
  return (Array.isArray(routes) ? routes : [])
    .map((route) => ({
      blockedId: stringOrEmpty(route?.blockedId),
      selectedId: stringOrEmpty(route?.selectedId),
      carriedTags: normalizeSymbolList(route?.carriedTags),
      suppressedTags: normalizeSymbolList(route?.suppressedTags),
      reason: stringOrEmpty(route?.reason)
    }))
    .filter((route) => route.blockedId && route.selectedId);
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

function addWeight(weights, key, delta) {
  if (!key) {
    return;
  }
  weights[key] = (weights[key] ?? 0) + delta;
}

function normalizeSymbolList(values = []) {
  return normalizeStringList(values).map(normalizeToken).filter(Boolean);
}

function normalizeStringList(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean))];
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}
