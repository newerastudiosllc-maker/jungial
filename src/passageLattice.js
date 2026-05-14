import { SeededRandom } from './random.js';

const BAND_CEILINGS = Object.freeze({
  gentle: 0.25,
  strange: 0.45,
  dark: 0.62,
  horrific: 0.78,
  abyssal: 0.92
});

const FALLBACK_PASSAGE = Object.freeze({
  schema: 'PassageV1',
  schemaVersion: 1,
  id: 'threshold_silence',
  motifs: ['threshold', 'silence'],
  pressureTags: ['invitation'],
  formTags: ['quiet_room'],
  intensityBand: 'gentle',
  allowedResponseKinds: ['approach', 'wait', 'speak'],
  returnAnchorTags: ['note', 'threshold'],
  variationFamily: 'threshold_default',
  baseWeight: 1
});

export function fibonacciSchedule(length = 6) {
  const schedule = [];
  let previous = 1;
  let current = 2;
  while (schedule.length < length) {
    schedule.push(previous);
    [previous, current] = [current, previous + current];
  }
  return schedule;
}

export function selectPassage({
  passages,
  covenant,
  seed,
  recentEchoTraces = [],
  dreamerMemoryContext = null,
  architectState = null,
  dreamWeather = null
} = {}) {
  const normalizedPassages = (passages?.length ? passages : [FALLBACK_PASSAGE]).map(normalizePassageForSelection);
  const recentIds = new Set(recentEchoTraces.slice(-4).map((trace) => trace.passageId));
  const recentForms = new Set(recentEchoTraces.slice(-4).flatMap((trace) => trace.formTags ?? []));
  const hardBoundaries = new Set(covenant?.hardBoundaryTags ?? []);
  const softBoundaries = new Set(covenant?.softBoundaryTags ?? []);
  const ceiling = covenant?.intensityCeiling ?? 0.35;
  const rng = new SeededRandom(seed);

  let candidates = normalizedPassages
    .filter((passage) => !recentIds.has(passage.id))
    .filter((passage) => passageAllowedByCeiling(passage, ceiling))
    .filter((passage) => !passage.pressureTags.some((tag) => hardBoundaries.has(tag)))
    .map((passage) => ({
      ...passage,
      selectionWeight: scorePassage(passage, { covenant, softBoundaries, recentForms, dreamerMemoryContext, architectState, dreamWeather })
    }))
    .filter((passage) => passage.selectionWeight > 0);

  if (candidates.length === 0) {
    candidates = normalizedPassages
      .filter((passage) => passageAllowedByCeiling(passage, ceiling))
      .filter((passage) => !passage.pressureTags.some((tag) => hardBoundaries.has(tag)))
      .map((passage) => ({ ...passage, selectionWeight: Math.max(0.05, passage.baseWeight) }));
  }

  const picked = rng.pickWeighted(candidates, (passage) => passage.selectionWeight).item ?? normalizedPassages[0];
  return {
    passage: stripSelectionWeight(picked),
    candidates: candidates.map(stripSelectionWeight)
  };
}

export function createEchoTrace({ passage, response = {}, dreamflowDeltas = {} } = {}) {
  const gestureTags = normalizeTags([...(response.gestureTags ?? []), response.kind]);
  return {
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: passage.id,
    motifsTouched: normalizeTags(response.motifsTouched?.length ? response.motifsTouched : passage.motifs),
    gestureTags,
    tempo: normalizeToken(response.tempo) || 'unhurried',
    pressureAccepted: clamp01(response.pressureAccepted ?? inferPressureAccepted(response.kind)),
    returnAnchorUsed: Boolean(response.returnAnchorUsed),
    boundarySignals: normalizeTags(response.boundarySignals),
    dreamflowDeltas: normalizeNumberMap(dreamflowDeltas)
  };
}

export function toGniPassageContext({ activePassage = null, recentEchoTraces = [], echoThreadIds = [] } = {}) {
  return {
    schema: 'PassageContextV1',
    schemaVersion: 1,
    activePassageId: activePassage?.id ?? null,
    recentMotifs: unique(recentEchoTraces.flatMap((trace) => trace.motifsTouched ?? [])).slice(0, 12),
    recentGestureTags: unique(recentEchoTraces.flatMap((trace) => trace.gestureTags ?? [])).slice(0, 12),
    echoThreadIds: unique(echoThreadIds).slice(0, 8)
  };
}

function scorePassage(passage, { covenant, softBoundaries, recentForms, dreamerMemoryContext, architectState, dreamWeather }) {
  let weight = passage.baseWeight;
  if (passage.pressureTags.some((tag) => softBoundaries.has(tag))) {
    weight *= 0.35;
  }
  if (passage.formTags.some((tag) => recentForms.has(tag))) {
    weight *= 0.4;
  }
  for (const tone of covenant?.toneTags ?? []) {
    if (passage.pressureTags.includes(tone) || passage.motifs.includes(tone)) {
      weight += 0.25;
    }
  }
  for (const motif of dreamerMemoryContext?.strongSymbols ?? []) {
    if (passage.motifs.includes(motif)) {
      weight += 0.1;
    }
  }
  for (const [key, value] of Object.entries(architectState?.futureDreamModuleWeights ?? {})) {
    const symbol = key.startsWith('symbol:') ? key.slice('symbol:'.length) : key;
    if (passage.motifs.includes(symbol) && Number.isFinite(value)) {
      weight += Math.min(0.3, value * 0.05);
    }
  }
  weight += scoreWeatherAffinity(passage, dreamWeather);
  return Number(Math.max(0, weight).toFixed(3));
}

function scoreWeatherAffinity(passage, dreamWeather) {
  if (!dreamWeather) {
    return 0;
  }

  const passageTags = new Set([
    ...passage.motifs,
    ...passage.pressureTags,
    ...passage.formTags
  ]);
  let affinity = 0;

  for (const tag of dreamWeather.weatherTags ?? []) {
    if (passageTags.has(tag)) {
      affinity += 0.12;
    }
  }
  if ((dreamWeather.dreadBudget?.cosmicDread ?? 0) > 0.4 && hasAnyTag(passageTags, ['void', 'star', 'cosmic_mystery'])) {
    affinity += 0.35;
  }
  if ((dreamWeather.dreadBudget?.watching ?? 0) > 0.35 && hasAnyTag(passageTags, ['mirror', 'shadow'])) {
    affinity += 0.2;
  }
  if ((dreamWeather.dreadBudget?.claustrophobia ?? 0) > 0.35 && passageTags.has('contained')) {
    affinity -= 0.12;
  }

  return affinity;
}

function hasAnyTag(tagSet, tags) {
  return tags.some((tag) => tagSet.has(tag));
}

function passageAllowedByCeiling(passage, ceiling) {
  return (BAND_CEILINGS[passage.intensityBand] ?? 0.45) <= ceiling + 0.001;
}

function normalizePassageForSelection(passage) {
  return {
    schema: passage.schema ?? 'PassageV1',
    schemaVersion: passage.schemaVersion ?? 1,
    id: passage.id,
    motifs: [...(passage.motifs ?? [])],
    pressureTags: [...(passage.pressureTags ?? [])],
    formTags: [...(passage.formTags ?? [])],
    intensityBand: passage.intensityBand ?? 'strange',
    allowedResponseKinds: [...(passage.allowedResponseKinds ?? [])],
    returnAnchorTags: [...(passage.returnAnchorTags ?? [])],
    variationFamily: passage.variationFamily,
    baseWeight: passage.baseWeight ?? 1
  };
}

function stripSelectionWeight(passage) {
  const { selectionWeight, ...rest } = passage;
  return rest;
}

function inferPressureAccepted(kind) {
  if (kind === 'withdraw' || kind === 'return_anchor') {
    return 0.15;
  }
  if (kind === 'wait') {
    return 0.3;
  }
  return 0.5;
}

function normalizeNumberMap(input = {}) {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => Number.isFinite(value))
      .map(([key, value]) => [key, Number(Math.max(-1, Math.min(1, value)).toFixed(3))])
  );
}

function normalizeTags(tags = []) {
  return unique((Array.isArray(tags) ? tags : [])
    .map(normalizeToken)
    .filter(Boolean));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(Number(value).toFixed(3))));
}
