import test from 'node:test';
import assert from 'node:assert/strict';

import { createDeterministicClock } from '../src/clock.js';
import {
  createListeningBeat,
  deriveListeningSummary,
  deriveSessionCovenantFromListening,
  recordFirstListeningToProfile,
  runFirstListeningSequence,
  validateFirstListeningRun
} from '../src/firstListening.js';
import {
  validateDreamerProfile,
  validateFirstListeningRun as validateFirstListeningRunContract,
  validateListeningBeat,
  validateSessionCovenant
} from '../src/contracts.js';
import { DreamerProfile } from '../src/dreamerProfile.js';

test('ListeningBeatV1 stores redacted symbolic response data', () => {
  const beat = createListeningBeat({
    beatId: 'beat-note',
    symbolicObjectId: 'threshold_note',
    responseKind: 'approach',
    gestureTags: ['approach', 'touch_note'],
    motifTags: ['threshold', 'word'],
    pressureAccepted: 0.44,
    boundarySignals: ['long_pause'],
    rawSpeech: 'this private phrase must vanish'
  });

  assert.deepEqual(beat, {
    schema: 'ListeningBeatV1',
    schemaVersion: 1,
    beatId: 'beat-note',
    symbolicObjectId: 'threshold_note',
    responseKind: 'approach',
    gestureTags: ['approach', 'touch_note'],
    motifTags: ['threshold', 'word'],
    pressureAccepted: 0.44,
    boundarySignals: ['long_pause']
  });
  assert.deepEqual(validateListeningBeat(beat), { valid: true, errors: [] });
  assert.equal(JSON.stringify(beat).includes('private phrase'), false);
});

test('FirstListeningRunV1 stores a redacted sequence summary', () => {
  const run = runFirstListeningSequence({
    seed: 144,
    beats: [
      {
        beatId: 'beat-note',
        symbolicObjectId: 'threshold_note',
        responseKind: 'approach',
        gestureTags: ['approach', 'touch_note'],
        motifTags: ['threshold', 'word'],
        pressureAccepted: 0.4,
        rawSpeech: 'the first private phrase'
      },
      {
        beatId: 'beat-lamp',
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
        gestureTags: ['return_anchor', 'touch_lamp'],
        motifTags: ['lamp', 'return'],
        pressureAccepted: 0.18
      }
    ]
  });

  assert.equal(run.schema, 'FirstListeningRunV1');
  assert.equal(run.schemaVersion, 1);
  assert.equal(run.seed, 144);
  assert.equal(run.beats.length, 3);
  assert.deepEqual(run.derivedToneTags, ['curious', 'deep']);
  assert.equal(run.intensityHint, 0.4);
  assert.deepEqual(run.returnAnchorHint, { kind: 'image', value: 'threshold_lamp' });
  assert.equal(run.redactedSummary, deriveListeningSummary(run));
  assert.match(run.redactedSummary, /threshold_note/);
  assert.deepEqual(validateFirstListeningRun(run), { valid: true, errors: [] });
  assert.deepEqual(validateFirstListeningRunContract(run), { valid: true, errors: [] });
  assert.equal(JSON.stringify(run).includes('first private phrase'), false);
});

test('First Listening contracts reject raw speech fields', () => {
  const beat = createListeningBeat({
    beatId: 'beat-note',
    symbolicObjectId: 'threshold_note',
    responseKind: 'speak',
    gestureTags: ['speak'],
    motifTags: ['word'],
    pressureAccepted: 0.3
  });
  const invalidBeat = {
    ...beat,
    rawSpeech: 'do not store this'
  };
  const invalidRun = {
    schema: 'FirstListeningRunV1',
    schemaVersion: 1,
    seed: 10,
    beats: [invalidBeat],
    derivedToneTags: ['curious'],
    intensityHint: 0.3,
    returnAnchorHint: { kind: 'image', value: 'the note' },
    redactedSummary: 'one redacted beat',
    rawResponseText: 'do not store this either'
  };

  assert.deepEqual(validateListeningBeat(invalidBeat), {
    valid: false,
    errors: ['listeningBeat.rawSpeech is not allowed']
  });
  assert.equal(validateFirstListeningRunContract(invalidRun).valid, false);
  assert.equal(validateFirstListeningRunContract(invalidRun).errors.includes('firstListeningRun.rawResponseText is not allowed'), true);
  assert.equal(validateFirstListeningRunContract(invalidRun).errors.includes('beats[0].rawSpeech is not allowed'), true);
});

test('First Listening derives a session covenant without inferring hard boundaries from raw speech', () => {
  const listeningRun = runFirstListeningSequence({
    seed: 377,
    beats: [
      {
        beatId: 'beat-note',
        symbolicObjectId: 'threshold_note',
        responseKind: 'approach',
        gestureTags: ['approach'],
        motifTags: ['threshold'],
        pressureAccepted: 0.45
      },
      {
        beatId: 'beat-mirror',
        symbolicObjectId: 'mirror_lens',
        responseKind: 'protect',
        gestureTags: ['protect'],
        motifTags: ['mirror', 'shadow'],
        pressureAccepted: 0.22,
        boundarySignals: ['long_pause'],
        rawSpeech: 'I have trauma but this sentence must not become a tag'
      },
      {
        beatId: 'beat-return',
        symbolicObjectId: 'small_lamp',
        responseKind: 'return_anchor',
        gestureTags: ['return_anchor'],
        motifTags: ['lamp'],
        pressureAccepted: 0.12
      }
    ]
  });
  const covenant = deriveSessionCovenantFromListening({
    listeningRun,
    explicitSessionSettings: {
      hardBoundaryTags: ['body_horror'],
      toneTags: ['friendly'],
      memoryScope: 'profile_aggregate'
    }
  });

  assert.equal(covenant.schema, 'SessionCovenantV1');
  assert.equal(covenant.mode, 'first_listening');
  assert.equal(covenant.toneTags.includes('curious'), true);
  assert.equal(covenant.toneTags.includes('deep'), true);
  assert.equal(covenant.toneTags.includes('friendly'), true);
  assert.equal(covenant.intensityCeiling <= 0.36, true);
  assert.deepEqual(covenant.returnAnchor, { kind: 'image', value: 'small_lamp' });
  assert.equal(covenant.hardBoundaryTags.includes('body_horror'), true);
  assert.equal(covenant.hardBoundaryTags.includes('trauma'), false);
  assert.equal(covenant.memoryScope, 'profile_aggregate');
  assert.deepEqual(validateSessionCovenant(covenant), { valid: true, errors: [] });
  assert.equal(JSON.stringify(covenant).includes('sentence must not'), false);
});

test('First Listening updates DreamerProfile aggregate memory without raw text', () => {
  const clock = createDeterministicClock({ startIso: '2101-01-01T00:00:00.000Z' });
  const profile = new DreamerProfile({
    profileId: 'dreamer-first-listening',
    rootSeed: 'root-first-listening'
  }, { clock });
  const listeningRun = runFirstListeningSequence({
    seed: 610,
    beats: [
      {
        beatId: 'beat-note',
        symbolicObjectId: 'threshold_note',
        responseKind: 'approach',
        gestureTags: ['approach', 'touch_note'],
        motifTags: ['threshold', 'word'],
        pressureAccepted: 0.33,
        rawSpeech: 'do not put this into memory'
      },
      {
        beatId: 'beat-mirror',
        symbolicObjectId: 'mirror_lens',
        responseKind: 'wait',
        gestureTags: ['wait', 'observe'],
        motifTags: ['mirror', 'self_observation'],
        pressureAccepted: 0.14,
        boundarySignals: ['long_pause']
      }
    ]
  });

  const snapshot = recordFirstListeningToProfile({
    profile,
    listeningRun,
    sessionBundleLike: {
      sessionId: 'first-listening-session',
      dominantArchetype: 'Seeker',
      archetypeVector: { Seeker: 1 },
      vibeState: 'calm_hopeful_boundless_bright_warm'
    },
    clock
  });

  assert.equal(snapshot.schema, 'DreamerProfileV1');
  assert.equal(snapshot.memory.symbols.threshold_note.count, 1);
  assert.equal(snapshot.memory.symbols.mirror_lens.count, 1);
  assert.equal(snapshot.memory.motifs.threshold.count, 1);
  assert.equal(snapshot.memory.motifs.self_observation.count, 1);
  assert.equal(snapshot.memory.gestures.touch_note.count, 1);
  assert.equal(snapshot.memory.gestures.observe.count, 1);
  assert.equal(snapshot.memory.vibeStates.calm_hopeful_boundless_bright_warm.count, 1);
  assert.deepEqual(validateDreamerProfile(snapshot), { valid: true, errors: [] });
  assert.equal(JSON.stringify(snapshot).includes('do not put this into memory'), false);
  assert.equal(JSON.stringify(snapshot).includes('rawSpeech'), false);
});
