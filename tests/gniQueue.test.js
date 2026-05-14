import test from 'node:test';
import assert from 'node:assert/strict';

import { GniDirectiveQueue } from '../src/gniQueue.js';

const REQUEST = Object.freeze({
  schema: 'GniProcessingRequestV1',
  schemaVersion: 1,
  provider: 'GNI',
  endpoint: 'gni://local-dev-placeholder',
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

test('GNI queue stores pending requests without duplicating session ids', () => {
  const queue = new GniDirectiveQueue();

  const first = queue.enqueue({
    request: REQUEST,
    reason: 'provider_empty',
    at: '2080-01-01T00:00:00.000Z'
  });
  const second = queue.enqueue({
    request: REQUEST,
    reason: 'retry',
    at: '2080-01-01T00:01:00.000Z'
  });

  assert.equal(first.id, 'gni_pending_session-one');
  assert.equal(second.id, first.id);
  assert.equal(queue.snapshot().pending.length, 1);
  assert.equal(queue.snapshot().pending[0].attempts, 2);
  assert.equal(queue.snapshot().pending[0].reason, 'retry');
});

test('GNI queue resolves pending request with normalized directive', () => {
  const queue = new GniDirectiveQueue();
  queue.enqueue({
    request: REQUEST,
    reason: 'pending',
    at: '2080-01-01T00:00:00.000Z'
  });

  const resolved = queue.resolve('gni_pending_session-one', {
    dreamWeightDeltas: { garden: 9 },
    symbolEchoes: [' light ', ''],
    pacingDelta: { intensity: 0.2, noise: 1 }
  }, {
    at: '2080-01-01T00:02:00.000Z'
  });

  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.directive.schema, 'JungialDirectiveV1');
  assert.equal(resolved.directive.dreamWeightDeltas.garden, 2);
  assert.deepEqual(resolved.directive.symbolEchoes, ['light']);
  assert.deepEqual(resolved.directive.pacingDelta, { intensity: 0.2 });
  assert.equal(queue.snapshot().pending.length, 0);
  assert.equal(queue.snapshot().resolved.length, 1);
});

test('GNI queue reports missing pending request without throwing', () => {
  const queue = new GniDirectiveQueue();

  const result = queue.resolve('missing', { dreamWeightDeltas: { garden: 0.2 } });

  assert.deepEqual(result, {
    status: 'missing',
    id: 'missing',
    directive: null
  });
});
