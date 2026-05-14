import test from 'node:test';
import assert from 'node:assert/strict';

import { createSessionCovenant } from '../src/sessionCovenant.js';
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
