import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createDeterministicClock } from '../src/clock.js';
import { TraceRecorder } from '../src/trace.js';
import { runSimulation } from '../src/simulation.js';
import { runReplay } from '../src/replay.js';
import { loadGameState } from '../src/persistence.js';

test('trace recorder creates deterministic ordered audit entries', () => {
  const trace = new TraceRecorder({
    clock: createDeterministicClock({ startIso: '2050-01-01T00:00:00.000Z' }),
    runId: 'trace-test'
  });

  trace.record('threshold.input', { kind: 'speech' });
  trace.record('dream.selected', { moduleId: 'mirror_hall' });

  assert.deepEqual(trace.snapshot(), {
    schema: 'JungialTraceV1',
    runId: 'trace-test',
    entries: [
      {
        index: 1,
        at: '2050-01-01T00:00:00.000Z',
        type: 'threshold.input',
        payload: { kind: 'speech' }
      },
      {
        index: 2,
        at: '2050-01-01T00:00:01.000Z',
        type: 'dream.selected',
        payload: { moduleId: 'mirror_hall' }
      }
    ]
  });
});

test('simulation trace explains dream journey and GNI handoff without in-world exposition', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-trace-'));
  const savePath = join(dir, 'save.json');
  const tracePath = join(dir, 'trace.json');

  try {
    const result = await runSimulation({
      seed: 777,
      savePath,
      tracePath,
      emulateGni: true,
      clock: createDeterministicClock({ startIso: '2050-02-03T04:05:06.000Z' })
    });
    const saved = await loadGameState(savePath);
    const traceTypes = result.trace.entries.map((entry) => entry.type);

    assert.equal(result.trace.schema, 'JungialTraceV1');
    assert.deepEqual(traceTypes, [
      'simulation.started',
      'threshold.input',
      'threshold.awakened',
      'portal.opened',
      'passage.gathered',
      'echo.trace.created',
      'session.arc.advanced',
      'dream.journey.selected',
      'dream.weather.created',
      'mask.selected',
      'session.content_gate.created',
      'journal.entry.written',
      'witness.bundle.created',
      'gni.request.created',
      'gni.firebreak.applied',
      'gni.emulator.directive.created',
      'gni.directive.applied',
      'experience.directive.created',
      'simulation.saved'
    ]);
    const firebreakEntry = result.trace.entries.find((entry) => entry.type === 'gni.firebreak.applied');
    const arcEntry = result.trace.entries.find((entry) => entry.type === 'session.arc.advanced');
    assert.equal(arcEntry.payload.decision, result.sessionArc.lastDecision);
    assert.equal(typeof arcEntry.payload.returnAvailable, 'boolean');
    assert.equal(firebreakEntry.payload.source, 'emulator');
    assert.equal(firebreakEntry.payload.clampCounts.dreamWeightDeltas, 1);
    assert.equal(result.trace.entries.find((entry) => entry.type === 'dream.journey.selected').payload.beats.length, 4);
    const weatherEntry = result.trace.entries.find((entry) => entry.type === 'dream.weather.created');
    const contentGateEntry = result.trace.entries.find((entry) => entry.type === 'session.content_gate.created');
    assert.equal(weatherEntry.payload.weatherId, result.dreamWeather.weatherId);
    assert.equal(weatherEntry.payload.traceId, result.weatherTrace.traceId);
    assert.deepEqual(weatherEntry.payload.sourceTags, result.weatherTrace.sourceTags);
    assert.deepEqual(weatherEntry.payload.suppressedTags, result.weatherTrace.suppressedTags);
    assert.equal(contentGateEntry.payload.gateId, result.sessionContentGate.gateId);
    assert.equal(contentGateEntry.payload.allowed, result.sessionContentGate.allowed);
    assert.equal(saved.trace.entries.length, result.trace.entries.length);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('replay trace captures scripted inputs and deterministic outcome', async () => {
  const result = await runReplay({
    clock: createDeterministicClock({ startIso: '2050-03-04T05:06:07.000Z' }),
    script: {
      seed: 44,
      inputs: [
        { kind: 'speech', text: 'the word' },
        { kind: 'action', name: 'open_portal', archetypes: ['Seeker'], symbols: ['portal'] }
      ]
    }
  });

  assert.deepEqual(result.trace.entries.map((entry) => entry.type), [
    'replay.started',
    'replay.input',
    'replay.input',
    'dream.journey.selected',
    'journal.entry.written',
    'witness.bundle.created',
    'architect.updated',
    'replay.completed'
  ]);
  assert.equal(result.trace.entries.at(-1).payload.selectedDreamId, result.selectedDream.id);
});
