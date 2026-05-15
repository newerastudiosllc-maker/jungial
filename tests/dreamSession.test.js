import test from 'node:test';
import assert from 'node:assert/strict';

import { createDeterministicClock } from '../src/clock.js';
import { validateDreamSession } from '../src/contracts.js';
import { applyPlayerInput } from '../src/input.js';
import { createJungialRuntime } from '../src/runtime.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';
import {
  createDreamSessionCheckpoint,
  resumeDreamSessionFromRuntime,
  runDreamSessionFromRuntime
} from '../src/dreamSession.js';

function createReadyRuntime(seed = 777) {
  const runtime = createJungialRuntime({
    seed,
    clock: createDeterministicClock({ startIso: '2077-01-01T00:00:00.000Z' })
  });

  applyPlayerInput({ source: 'system', kind: 'speech', text: 'the word' }, runtime);
  applyPlayerInput({ source: 'system', kind: 'action', name: 'open_portal' }, runtime);
  return runtime;
}

test('continuous dream sessions advance multiple hidden beats', () => {
  const runtime = createReadyRuntime(41);
  const session = runDreamSessionFromRuntime({
    runtime,
    covenant: createSessionCovenant({
      toneTags: ['strange', 'dark'],
      intensityCeiling: 0.62
    }),
    seed: 123,
    maxBeats: 4,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.48 },
      { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.56 },
      { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.32 },
      { kind: 'approach', gestureTags: ['opened'], pressureAccepted: 0.5 }
    ]
  });

  assert.equal(session.schema, 'DreamSessionV1');
  assert.equal(session.schemaVersion, 1);
  assert.equal(session.completedBeats, 4);
  assert.equal(session.endedBecause, 'max_beats');
  assert.equal(session.finalSessionArc.beatCount, 4);
  assert.equal(session.beats.length, 4);
  assert.ok(new Set(session.beats.map((beat) => beat.passage.id)).size >= 2);

  for (const [index, beat] of session.beats.entries()) {
    assert.equal(beat.index, index + 1);
    assert.equal(beat.echoTrace.schema, 'EchoTraceV1');
    assert.equal(beat.sessionArc.schema, 'SessionArcV1');
    assert.equal(beat.arcDirective.schema, 'SessionArcDirectiveV1');
    assert.equal(beat.dreamJourney.schema, 'DreamJourneyV1');
    assert.equal(beat.dreamWeather.schema, 'DreamWeatherV1');
    assert.equal(beat.weatherTrace.schema, 'WeatherTraceV1');
    assert.equal(beat.contentGate.schema, 'SessionContentGateV1');
    assert.equal(beat.contentGate.playerFacingText, null);
    assert.equal(beat.contentReplacementPlan.schema, 'SessionContentReplacementPlanV1');
    assert.equal(beat.contentReplacementPlan.playerFacingText, null);
    assert.equal(typeof beat.returnAvailable, 'boolean');
  }
  assert.deepEqual(validateDreamSession(session), { valid: true, errors: [] });
});

test('continuous dream sessions stop on a return anchor without retaining raw response text', () => {
  const runtime = createReadyRuntime(42);
  const session = runDreamSessionFromRuntime({
    runtime,
    covenant: createSessionCovenant({ intensityCeiling: 0.7 }),
    seed: 456,
    maxBeats: 5,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.5 },
      {
        kind: 'return_anchor',
        gestureTags: ['touched_note'],
        pressureAccepted: 0.2,
        returnAnchorUsed: true,
        rawSpeech: 'this exact sentence must never be saved'
      }
    ]
  });
  const serialized = JSON.stringify(session);

  assert.equal(session.completedBeats, 2);
  assert.equal(session.endedBecause, 'return_anchor');
  assert.equal(session.finalSessionArc.returnReadiness >= 0.35, true);
  assert.equal(serialized.includes('this exact sentence must never be saved'), false);
  assert.equal(serialized.includes('rawSpeech'), false);
});

test('continuous dream sessions can stop as soon as return becomes available', () => {
  const runtime = createReadyRuntime(43);
  const session = runDreamSessionFromRuntime({
    runtime,
    covenant: createSessionCovenant({ intensityCeiling: 0.7 }),
    seed: 789,
    maxBeats: 6,
    stopWhenReturnAvailable: true,
    responses: [
      {
        kind: 'wait',
        gestureTags: ['withdrew'],
        pressureAccepted: 0.12,
        boundarySignals: ['long_pause']
      }
    ]
  });

  assert.equal(session.completedBeats, 1);
  assert.equal(session.endedBecause, 'return_available');
  assert.equal(session.beats[0].returnAvailable, true);
});

test('continuous dream sessions avoid dream modules that cross covenant hard boundaries', () => {
  const session = runDreamSessionFromRuntime({
    runtime: createReadyRuntime(45),
    covenant: createSessionCovenant({
      intensityCeiling: 0.82,
      hardBoundaryTags: ['annihilation', 'shadow', 'dissolution']
    }),
    seed: 1045,
    maxBeats: 3
  });
  const blockedSymbols = new Set(['annihilation', 'shadow', 'dissolution']);

  for (const beat of session.beats) {
    assert.equal(beat.dreamJourney.policy.schema, 'DreamJourneyPolicyV1');
    assert.equal(beat.dreamJourney.policy.playerFacingText, null);
    assert.equal(beat.dreamJourney.symbolTrail.some((symbol) => blockedSymbols.has(symbol)), false);
    assert.equal(beat.selectedDream.symbolicTags.some((symbol) => blockedSymbols.has(symbol)), false);
  }
  assert.deepEqual(validateDreamSession(session), { valid: true, errors: [] });
});

test('continuous dream sessions are deterministic from runtime seed and response trace', () => {
  const first = runDreamSessionFromRuntime({
    runtime: createReadyRuntime(44),
    covenant: createSessionCovenant({ toneTags: ['strange'], intensityCeiling: 0.45 }),
    seed: 999,
    maxBeats: 3,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
      { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.45 },
      { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 }
    ]
  });
  const second = runDreamSessionFromRuntime({
    runtime: createReadyRuntime(44),
    covenant: createSessionCovenant({ toneTags: ['strange'], intensityCeiling: 0.45 }),
    seed: 999,
    maxBeats: 3,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
      { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.45 },
      { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 }
    ]
  });

  assert.deepEqual(first, second);
});

test('dream session checkpoints resume to the same path as uninterrupted play', () => {
  const covenant = createSessionCovenant({ toneTags: ['strange', 'dark'], intensityCeiling: 0.62 });
  const responses = [
    { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
    { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.46 },
    { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 },
    { kind: 'approach', gestureTags: ['opened'], pressureAccepted: 0.5 },
    { kind: 'speak', gestureTags: ['named'], pressureAccepted: 0.52 }
  ];
  const uninterrupted = runDreamSessionFromRuntime({
    runtime: createReadyRuntime(55),
    covenant,
    seed: 2025,
    maxBeats: 5,
    responses
  });
  const partial = runDreamSessionFromRuntime({
    runtime: createReadyRuntime(55),
    covenant,
    seed: 2025,
    maxBeats: 5,
    beatsToRun: 2,
    responses: responses.slice(0, 2)
  });
  const checkpoint = createDreamSessionCheckpoint(partial);
  const resumed = resumeDreamSessionFromRuntime({
    runtime: createReadyRuntime(55),
    checkpoint,
    covenant,
    responses: responses.slice(2),
    beatsToRun: 3
  });

  assert.equal(partial.endedBecause, 'checkpoint');
  assert.equal(checkpoint.schema, 'DreamSessionCheckpointV1');
  assert.equal(checkpoint.nextBeatIndex, 3);
  assert.equal(checkpoint.isComplete, false);
  assert.deepEqual(resumed, uninterrupted);
});

test('dream session checkpoints stay redacted', () => {
  const partial = runDreamSessionFromRuntime({
    runtime: createReadyRuntime(56),
    covenant: createSessionCovenant({ intensityCeiling: 0.45 }),
    seed: 2026,
    maxBeats: 4,
    beatsToRun: 1,
    responses: [{
      kind: 'speak',
      gestureTags: ['answered'],
      pressureAccepted: 0.4,
      rawSpeech: 'do not preserve this private sentence'
    }]
  });
  const checkpoint = createDreamSessionCheckpoint(partial);
  const serialized = JSON.stringify(checkpoint);

  assert.equal(serialized.includes('do not preserve this private sentence'), false);
  assert.equal(serialized.includes('rawSpeech'), false);
});

test('complete dream session checkpoints do not resume into extra beats', () => {
  const completed = runDreamSessionFromRuntime({
    runtime: createReadyRuntime(57),
    covenant: createSessionCovenant({ intensityCeiling: 0.7 }),
    seed: 2027,
    maxBeats: 5,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
      { kind: 'return_anchor', gestureTags: ['touched_note'], pressureAccepted: 0.2, returnAnchorUsed: true }
    ]
  });
  const checkpoint = createDreamSessionCheckpoint(completed);
  const resumed = resumeDreamSessionFromRuntime({
    runtime: createReadyRuntime(57),
    checkpoint,
    covenant: createSessionCovenant({ intensityCeiling: 0.7 }),
    responses: [
      { kind: 'speak', gestureTags: ['should_not_happen'], pressureAccepted: 0.9 }
    ]
  });

  assert.equal(checkpoint.isComplete, true);
  assert.deepEqual(resumed, completed);
});
