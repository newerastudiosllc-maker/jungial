import test from 'node:test';
import assert from 'node:assert/strict';

import { inspectTrace } from '../src/traceInspector.js';

test('trace inspector summarizes journey, GNI, and event counts', () => {
  const summary = inspectTrace({
    schema: 'JungialTraceV1',
    runId: 'trace-one',
    entries: [
      { index: 1, at: 'x', type: 'simulation.started', payload: {} },
      {
        index: 2,
        at: 'x',
        type: 'dream.journey.selected',
        payload: {
          summary: 'entry:Garden -> pressure:Mirror Hall',
          symbolTrail: ['growth', 'reflection']
        }
      },
      { index: 3, at: 'x', type: 'gni.request.created', payload: { provider: 'GNI' } },
      { index: 4, at: 'x', type: 'gni.request.queued', payload: { id: 'gni_pending_session-one' } },
      { index: 5, at: 'x', type: 'gni.directive.applied', payload: { directive: { dreamWeightDeltas: { garden: 0.2 } } } }
    ]
  });

  assert.deepEqual(summary, {
    schema: 'JungialTraceSummaryV1',
    runId: 'trace-one',
    eventCounts: {
      'simulation.started': 1,
      'dream.journey.selected': 1,
      'gni.request.created': 1,
      'gni.request.queued': 1,
      'gni.directive.applied': 1
    },
    journeySummary: 'entry:Garden -> pressure:Mirror Hall',
    symbolTrail: ['growth', 'reflection'],
    gniRequestCount: 1,
    gniQueuedRequestCount: 1,
    gniDirectiveCount: 1
  });
});

test('trace inspector summarizes the latest campaign journey', () => {
  const summary = inspectTrace({
    schema: 'JungialTraceV1',
    runId: 'campaign-trace',
    entries: [
      { index: 1, at: 'x', type: 'campaign.started', payload: {} },
      {
        index: 2,
        at: 'x',
        type: 'dream.journey.selected',
        payload: {
          cycle: 1,
          summary: 'entry:Garden -> return:Cabin',
          symbolTrail: ['growth', 'memory']
        }
      },
      {
        index: 3,
        at: 'x',
        type: 'dream.journey.selected',
        payload: {
          cycle: 2,
          summary: 'entry:Mirror Hall -> return:Boundless White Void',
          symbolTrail: ['reflection', 'silence']
        }
      },
      { index: 4, at: 'x', type: 'gni.directive.applied', payload: { cycle: 2 } }
    ]
  });

  assert.equal(summary.journeySummary, 'entry:Mirror Hall -> return:Boundless White Void');
  assert.deepEqual(summary.symbolTrail, ['reflection', 'silence']);
  assert.equal(summary.gniQueuedRequestCount, 0);
  assert.equal(summary.gniDirectiveCount, 1);
});
