import test from 'node:test';
import assert from 'node:assert/strict';

import { createMockGniServer } from '../src/mockGniServer.js';

const REQUEST = Object.freeze({
  schema: 'GniProcessingRequestV1',
  schemaVersion: 1,
  provider: 'GNI',
  endpoint: 'http://127.0.0.1/gni',
  model: 'gni-dream-director-dev',
  contract: {
    inputFormat: 'SessionBundleV1',
    outputFormat: 'JungialDirectiveV1',
    allowedDirectives: ['adjust_dream_weights']
  },
  payload: {
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    coherence: 0.6,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal'],
    recentActions: ['open_portal'],
    roomConfigSnapshot: { portalOpen: true },
    selectedDream: { id: 'garden' },
    archetypeVector: { Seeker: 1 }
  }
});

test('mock GNI server returns a normalized directive over HTTP', async () => {
  const mock = createMockGniServer({
    directive: {
      dreamWeightDeltas: { garden: 9 },
      symbolEchoes: [' light ', ''],
      pacingDelta: { intensity: 0.2, noise: 1 }
    }
  });

  try {
    await mock.start();
    const response = await fetch(`${mock.url}/gni`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(REQUEST)
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.schema, 'JungialDirectiveV1');
    assert.equal(body.dreamWeightDeltas.garden, 2);
    assert.deepEqual(body.symbolEchoes, ['light']);
    assert.deepEqual(body.pacingDelta, { intensity: 0.2 });
  } finally {
    await mock.stop();
  }
});

test('mock GNI server can accept async jobs and expose a job status URL', async () => {
  const mock = createMockGniServer({
    mode: 'async',
    directive: {
      dreamWeightDeltas: { mirror_hall: 0.25 },
      symbolEchoes: ['mirror']
    }
  });

  try {
    await mock.start();
    const response = await fetch(`${mock.url}/gni`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(REQUEST)
    });
    const accepted = await response.json();
    const statusResponse = await fetch(accepted.statusUrl);
    const status = await statusResponse.json();

    assert.equal(response.status, 202);
    assert.equal(accepted.jobId, 'gni-job-001');
    assert.equal(accepted.pollAfterMs, 0);
    assert.equal(status.status, 'ready');
    assert.equal(status.directive.schema, 'JungialDirectiveV1');
    assert.equal(status.directive.dreamWeightDeltas.mirror_hall, 0.25);
  } finally {
    await mock.stop();
  }
});

test('mock GNI server can keep async jobs pending before they resolve', async () => {
  const mock = createMockGniServer({
    mode: 'async',
    readyAfterPolls: 2,
    directive: {
      dreamWeightDeltas: { mirror_hall: 0.25 },
      symbolEchoes: ['mirror']
    }
  });

  try {
    await mock.start();
    const response = await fetch(`${mock.url}/gni`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(REQUEST)
    });
    const accepted = await response.json();
    const firstStatus = await (await fetch(accepted.statusUrl)).json();
    const secondStatus = await (await fetch(accepted.statusUrl)).json();

    assert.equal(firstStatus.status, 'pending');
    assert.equal(firstStatus.jobId, 'gni-job-001');
    assert.equal(secondStatus.status, 'ready');
    assert.equal(secondStatus.directive.dreamWeightDeltas.mirror_hall, 0.25);
  } finally {
    await mock.stop();
  }
});
