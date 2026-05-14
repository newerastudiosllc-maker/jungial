import test from 'node:test';
import assert from 'node:assert/strict';

import { createSessionCovenant } from '../src/sessionCovenant.js';
import { createDreamWeather } from '../src/dreamWeather.js';
import {
  createEchoTrace,
  fibonacciSchedule,
  selectPassage,
  toGniPassageContext
} from '../src/passageLattice.js';

const passages = [
  {
    schema: 'PassageV1',
    schemaVersion: 1,
    id: 'door_breathing_low',
    motifs: ['door', 'breath', 'threshold'],
    pressureTags: ['unknown', 'invitation'],
    formTags: ['locked_door'],
    intensityBand: 'strange',
    allowedResponseKinds: ['approach', 'speak'],
    returnAnchorTags: ['lamp'],
    variationFamily: 'threshold_doors',
    baseWeight: 1
  },
  {
    schema: 'PassageV1',
    schemaVersion: 1,
    id: 'black_star_silence',
    motifs: ['star', 'void', 'silence'],
    pressureTags: ['annihilation', 'cosmic_mystery'],
    formTags: ['black_star'],
    intensityBand: 'horrific',
    allowedResponseKinds: ['approach', 'withdraw'],
    returnAnchorTags: ['lamp'],
    variationFamily: 'cosmic_thresholds',
    baseWeight: 1
  }
];

test('fibonacci schedule returns recurrence intervals for EchoThreads', () => {
  assert.deepEqual(fibonacciSchedule(7), [1, 2, 3, 5, 8, 13, 21]);
});

test('selection excludes hard boundaries and respects intensity ceiling', () => {
  const covenant = createSessionCovenant({
    toneTags: ['strange'],
    intensityCeiling: 0.45,
    hardBoundaryTags: ['annihilation']
  });
  const result = selectPassage({
    passages,
    covenant,
    seed: 5,
    recentEchoTraces: []
  });

  assert.equal(result.passage.id, 'door_breathing_low');
  assert.ok(result.candidates.every((candidate) => candidate.id !== 'black_star_silence'));
});

test('selection suppresses recent exact Passage repeats', () => {
  const covenant = createSessionCovenant({
    toneTags: ['horrific'],
    intensityCeiling: 1
  });
  const result = selectPassage({
    passages,
    covenant,
    seed: 5,
    recentEchoTraces: [
      { passageId: 'door_breathing_low', motifsTouched: ['door'], gestureTags: [], boundarySignals: [] }
    ]
  });

  assert.equal(result.passage.id, 'black_star_silence');
});

test('Dream Weather nudges compatible passages without bypassing hard boundaries', () => {
  const localPassages = [
    {
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'soft_lamp_landing',
      motifs: ['lamp', 'threshold'],
      pressureTags: ['invitation'],
      formTags: ['quiet_room'],
      intensityBand: 'gentle',
      allowedResponseKinds: ['wait', 'speak'],
      returnAnchorTags: ['lamp'],
      variationFamily: 'safe_thresholds',
      baseWeight: 1
    },
    {
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'void_star_window',
      motifs: ['void', 'star'],
      pressureTags: ['cosmic_mystery'],
      formTags: ['black_star'],
      intensityBand: 'horrific',
      allowedResponseKinds: ['approach', 'withdraw'],
      returnAnchorTags: ['lamp'],
      variationFamily: 'cosmic_thresholds',
      baseWeight: 0.7
    },
    {
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'pursuit_under_stars',
      motifs: ['void', 'star'],
      pressureTags: ['pursuit', 'cosmic_mystery'],
      formTags: ['black_star'],
      intensityBand: 'horrific',
      allowedResponseKinds: ['withdraw'],
      returnAnchorTags: ['lamp'],
      variationFamily: 'blocked_cosmic_thresholds',
      baseWeight: 10
    }
  ];
  const covenant = createSessionCovenant({
    intensityCeiling: 0.9,
    hardBoundaryTags: ['pursuit']
  });
  const dreamWeather = createDreamWeather({
    covenant,
    seed: 37,
    weatherTags: ['void', 'star', 'cosmic_mystery'],
    dreadBudget: {
      cosmicDread: 0.7
    },
    selectedDream: {
      tags: ['cosmic_mystery', 'void', 'star']
    }
  });

  const result = selectPassage({
    passages: localPassages,
    covenant,
    seed: 553,
    dreamWeather
  });

  assert.equal(result.passage.id, 'void_star_window');
  assert.ok(result.candidates.every((candidate) => candidate.id !== 'pursuit_under_stars'));
  assert.equal(result.passage.selectionWeight, undefined);
});

test('selection excludes hard boundaries across motifs pressure and forms', () => {
  const localPassages = [
    {
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'pursuit_in_motif',
      motifs: ['pursuit', 'star'],
      pressureTags: ['cosmic_mystery'],
      formTags: ['black_star'],
      intensityBand: 'horrific',
      allowedResponseKinds: ['withdraw'],
      returnAnchorTags: ['lamp'],
      variationFamily: 'motif_boundary',
      baseWeight: 10
    },
    {
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'pursuit_in_form',
      motifs: ['star'],
      pressureTags: ['cosmic_mystery'],
      formTags: ['pursuit'],
      intensityBand: 'horrific',
      allowedResponseKinds: ['withdraw'],
      returnAnchorTags: ['lamp'],
      variationFamily: 'form_boundary',
      baseWeight: 10
    },
    {
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'quiet_lamp',
      motifs: ['lamp'],
      pressureTags: ['invitation'],
      formTags: ['quiet_room'],
      intensityBand: 'gentle',
      allowedResponseKinds: ['wait'],
      returnAnchorTags: ['lamp'],
      variationFamily: 'safe_boundary',
      baseWeight: 0.1
    }
  ];
  const covenant = createSessionCovenant({
    intensityCeiling: 0.9,
    hardBoundaryTags: ['pursuit']
  });
  const result = selectPassage({
    passages: localPassages,
    covenant,
    seed: 12,
    dreamWeather: createDreamWeather({
      covenant,
      seed: 12,
      weatherTags: ['pursuit', 'star'],
      dreadBudget: { pursuit: 0.7, cosmicDread: 0.7 }
    })
  });

  assert.equal(result.passage.id, 'quiet_lamp');
  assert.ok(result.candidates.every((candidate) => !candidate.motifs.includes('pursuit')));
  assert.ok(result.candidates.every((candidate) => !candidate.formTags.includes('pursuit')));
});

test('selection uses a safe fallback when every supplied passage crosses a hard boundary', () => {
  const covenant = createSessionCovenant({
    intensityCeiling: 0.9,
    hardBoundaryTags: ['pursuit']
  });
  const result = selectPassage({
    passages: [{
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'only_blocked',
      motifs: ['pursuit'],
      pressureTags: ['invitation'],
      formTags: ['quiet_room'],
      intensityBand: 'gentle',
      allowedResponseKinds: ['wait'],
      returnAnchorTags: ['lamp'],
      variationFamily: 'blocked_only',
      baseWeight: 1
    }],
    covenant,
    seed: 8
  });

  assert.notEqual(result.passage.id, 'only_blocked');
  assert.ok(!result.passage.motifs.includes('pursuit'));
  assert.ok(result.candidates.every((candidate) => candidate.id !== 'only_blocked'));
});

test('EchoTrace captures symbolic response without raw speech', () => {
  const trace = createEchoTrace({
    passage: passages[0],
    response: {
      kind: 'speak',
      rawSpeech: 'please do not store this',
      gestureTags: ['spoke_before_touching'],
      tempo: 'hesitant_then_committed',
      pressureAccepted: 0.42,
      returnAnchorUsed: false,
      boundarySignals: ['long_pause']
    }
  });

  assert.deepEqual(trace, {
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: 'door_breathing_low',
    motifsTouched: ['door', 'breath', 'threshold'],
    gestureTags: ['spoke_before_touching', 'speak'],
    tempo: 'hesitant_then_committed',
    pressureAccepted: 0.42,
    returnAnchorUsed: false,
    boundarySignals: ['long_pause'],
    dreamflowDeltas: {}
  });
});

test('GNI Passage context is compact and redacted', () => {
  const trace = createEchoTrace({
    passage: passages[0],
    response: { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.5 }
  });

  assert.deepEqual(toGniPassageContext({
    activePassage: passages[0],
    recentEchoTraces: [trace]
  }), {
    schema: 'PassageContextV1',
    schemaVersion: 1,
    activePassageId: 'door_breathing_low',
    recentMotifs: ['door', 'breath', 'threshold'],
    recentGestureTags: ['approached', 'approach'],
    echoThreadIds: []
  });
});
