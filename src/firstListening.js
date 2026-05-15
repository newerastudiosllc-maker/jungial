import { validateFirstListeningRun as validateFirstListeningRunContract } from './contracts.js';
import { createSessionCovenant } from './sessionCovenant.js';
import { DreamerProfile } from './dreamerProfile.js';

const DEFAULT_RETURN_ANCHOR = Object.freeze({
  kind: 'image',
  value: 'the note in the Threshold Chamber'
});

const DEFAULT_BEATS = Object.freeze([
  {
    beatId: 'beat-note',
    symbolicObjectId: 'threshold_note',
    responseKind: 'approach',
    gestureTags: ['approach'],
    motifTags: ['threshold', 'word'],
    pressureAccepted: 0.32
  },
  {
    beatId: 'beat-heartlight',
    symbolicObjectId: 'heartlight',
    responseKind: 'open',
    gestureTags: ['open', 'breathe'],
    motifTags: ['lamp', 'breath'],
    pressureAccepted: 0.36
  },
  {
    beatId: 'beat-return',
    symbolicObjectId: 'threshold_lamp',
    responseKind: 'return_anchor',
    gestureTags: ['return_anchor'],
    motifTags: ['lamp'],
    pressureAccepted: 0.18
  }
]);

export function createListeningBeat(input = {}) {
  return {
    schema: 'ListeningBeatV1',
    schemaVersion: 1,
    beatId: normalizeId(input.beatId) || 'beat-unknown',
    symbolicObjectId: normalizeToken(input.symbolicObjectId) || 'threshold_note',
    responseKind: normalizeToken(input.responseKind) || 'wait',
    gestureTags: normalizeTags(input.gestureTags),
    motifTags: normalizeTags(input.motifTags),
    pressureAccepted: clamp01(input.pressureAccepted ?? 0),
    boundarySignals: normalizeTags(input.boundarySignals)
  };
}

export function runFirstListeningSequence({ seed = 0, beats = DEFAULT_BEATS } = {}) {
  const redactedBeats = (Array.isArray(beats) && beats.length > 0 ? beats : DEFAULT_BEATS)
    .map((beat) => createListeningBeat(beat));
  const run = {
    schema: 'FirstListeningRunV1',
    schemaVersion: 1,
    seed: Number.isFinite(seed) ? seed : 0,
    beats: redactedBeats,
    derivedToneTags: deriveToneTags(redactedBeats),
    intensityHint: deriveIntensityHint(redactedBeats),
    returnAnchorHint: deriveReturnAnchorHint(redactedBeats),
    redactedSummary: ''
  };

  run.redactedSummary = deriveListeningSummary(run);
  return run;
}

export function deriveListeningSummary(run = {}) {
  const beats = Array.isArray(run.beats) ? run.beats : [];
  if (beats.length === 0) {
    return 'The chamber stayed quiet.';
  }

  return beats
    .map((beat) => `${beat.symbolicObjectId} answered as ${beat.responseKind}`)
    .join('; ');
}

export function validateFirstListeningRun(run) {
  return validateFirstListeningRunContract(run);
}

export function deriveSessionCovenantFromListening({
  listeningRun,
  explicitSessionSettings = {}
} = {}) {
  const run = listeningRun?.schema === 'FirstListeningRunV1'
    ? listeningRun
    : runFirstListeningSequence();
  const allBoundarySignals = uniqueTags(run.beats.flatMap((beat) => beat.boundarySignals));
  const responseKinds = uniqueTags(run.beats.map((beat) => beat.responseKind));
  const asksForSoftStart = allBoundarySignals.includes('long_pause')
    || responseKinds.includes('wait')
    || responseKinds.includes('withdraw')
    || responseKinds.includes('protect');
  const baseCeiling = Number.isFinite(explicitSessionSettings.intensityCeiling)
    ? explicitSessionSettings.intensityCeiling
    : Math.max(0.25, Math.min(0.55, run.intensityHint + 0.08));
  const intensityCeiling = asksForSoftStart ? Math.min(baseCeiling, 0.36) : baseCeiling;

  return createSessionCovenant({
    ...explicitSessionSettings,
    mode: 'first_listening',
    toneTags: uniqueTags([
      ...(explicitSessionSettings.toneTags ?? []),
      ...run.derivedToneTags
    ]),
    intensityCeiling,
    hardBoundaryTags: explicitSessionSettings.hardBoundaryTags ?? [],
    softBoundaryTags: uniqueTags([
      ...(explicitSessionSettings.softBoundaryTags ?? []),
      ...allBoundarySignals
    ]),
    allowedPressureTags: uniqueTags([
      ...(explicitSessionSettings.allowedPressureTags ?? []),
      ...run.beats.flatMap((beat) => beat.motifTags)
    ]),
    returnAnchor: run.returnAnchorHint ?? explicitSessionSettings.returnAnchor ?? DEFAULT_RETURN_ANCHOR,
    groundingPreference: explicitSessionSettings.groundingPreference ?? 'quiet_room',
    memoryScope: explicitSessionSettings.memoryScope ?? 'session_only'
  });
}

export function recordFirstListeningToProfile({
  profile,
  listeningRun,
  sessionBundleLike = {},
  clock = undefined
} = {}) {
  const dreamer = profile instanceof DreamerProfile
    ? profile
    : new DreamerProfile(profile ?? {}, { clock });
  const run = listeningRun?.schema === 'FirstListeningRunV1'
    ? listeningRun
    : runFirstListeningSequence();
  const sessionBundle = {
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: sessionBundleLike.sessionId ?? 'first-listening-session',
    dominantArchetype: sessionBundleLike.dominantArchetype ?? 'Seeker',
    coherence: Number.isFinite(sessionBundleLike.coherence) ? sessionBundleLike.coherence : 0.5,
    vibeState: sessionBundleLike.vibeState ?? 'calm_hopeful_boundless_bright_warm',
    recentSymbols: uniqueTags([
      ...(sessionBundleLike.recentSymbols ?? []),
      ...run.beats.map((beat) => beat.symbolicObjectId)
    ]),
    recentActions: uniqueTags([
      ...(sessionBundleLike.recentActions ?? []),
      ...run.beats.map((beat) => `listen_${beat.responseKind}`)
    ]),
    roomConfigSnapshot: {
      firstListening: true,
      ...(sessionBundleLike.roomConfigSnapshot ?? {})
    },
    archetypeVector: {
      ...(sessionBundleLike.archetypeVector ?? { Seeker: 1 })
    }
  };
  const echoTrace = {
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: 'first_listening',
    motifsTouched: uniqueTags(run.beats.flatMap((beat) => beat.motifTags)),
    gestureTags: uniqueTags(run.beats.flatMap((beat) => beat.gestureTags)),
    tempo: run.beats.some((beat) => beat.boundarySignals.includes('long_pause'))
      ? 'unhurried'
      : 'steady',
    pressureAccepted: averagePressure(run.beats),
    returnAnchorUsed: run.beats.some((beat) => beat.responseKind === 'return_anchor'),
    boundarySignals: uniqueTags(run.beats.flatMap((beat) => beat.boundarySignals)),
    dreamflowDeltas: {}
  };

  return dreamer.recordSession({ sessionBundle, echoTrace });
}

function deriveToneTags(beats) {
  const responseKinds = new Set(beats.map((beat) => beat.responseKind));
  const gestureTags = new Set(beats.flatMap((beat) => beat.gestureTags));
  const motifTags = new Set(beats.flatMap((beat) => beat.motifTags));

  return uniqueTags([
    responseKinds.has('approach') || gestureTags.has('approach') ? 'curious' : null,
    responseKinds.has('open') || gestureTags.has('open') || motifTags.has('breath') || motifTags.has('shadow') ? 'deep' : null,
    responseKinds.has('protect') || gestureTags.has('protect') ? 'protective' : null,
    responseKinds.has('withdraw') || responseKinds.has('wait') ? 'gentle' : null
  ]);
}

function deriveIntensityHint(beats) {
  return round(Math.max(...beats.map((beat) => beat.pressureAccepted), 0));
}

function deriveReturnAnchorHint(beats) {
  const anchorBeat = [...beats].reverse().find((beat) => {
    return beat.responseKind === 'return_anchor' || beat.gestureTags.includes('return_anchor');
  });
  if (!anchorBeat) {
    return { ...DEFAULT_RETURN_ANCHOR };
  }

  return {
    kind: 'image',
    value: anchorBeat.symbolicObjectId
  };
}

function averagePressure(beats) {
  if (!beats.length) {
    return 0;
  }
  return round(beats.reduce((sum, beat) => sum + beat.pressureAccepted, 0) / beats.length);
}

function normalizeTags(tags = []) {
  return uniqueTags((Array.isArray(tags) ? tags : [])
    .map(normalizeToken)
    .filter(Boolean));
}

function uniqueTags(tags = []) {
  return [...new Set(tags.filter(Boolean))];
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function normalizeId(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1, round(numeric)));
}

function round(value) {
  return Number(Number(value).toFixed(3));
}
