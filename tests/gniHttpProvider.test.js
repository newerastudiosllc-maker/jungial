import test from 'node:test';
import assert from 'node:assert/strict';

import { GniHttpProvider } from '../src/gniHttpProvider.js';
import { GniBridge } from '../src/gniBridge.js';

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

test('GNI HTTP provider posts processing requests as JSON with optional bearer auth', async () => {
  const calls = [];
  const provider = new GniHttpProvider({
    endpoint: 'https://gni.local/direct',
    bearerToken: 'secret-token',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            schema: 'JungialDirectiveV1',
            schemaVersion: 1,
            dreamWeightDeltas: { garden: 0.3 }
          };
        }
      };
    }
  });

  const response = await provider.processRequest(REQUEST);

  assert.equal(calls[0].url, 'https://gni.local/direct');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.authorization, 'Bearer secret-token');
  assert.equal(JSON.parse(calls[0].options.body).schema, 'GniProcessingRequestV1');
  assert.equal(response.dreamWeightDeltas.garden, 0.3);
});

test('GNI HTTP provider raises useful errors for non-2xx responses', async () => {
  const provider = new GniHttpProvider({
    endpoint: 'https://gni.local/direct',
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      async text() {
        return 'not ready';
      }
    })
  });

  await assert.rejects(
    () => provider.processRequest(REQUEST),
    /GNI HTTP provider failed with 503: not ready/
  );
});

test('GNI HTTP provider treats accepted or empty responses as pending work', async () => {
  for (const status of [202, 204]) {
    const provider = new GniHttpProvider({
      endpoint: 'https://gni.local/direct',
      fetchImpl: async () => ({
        ok: true,
        status
      })
    });

    const response = await provider.processRequest(REQUEST);

    assert.equal(response, null);
  }
});

test('GNI bridge queues accepted HTTP provider responses without marking them errors', async () => {
  const bridge = new GniBridge({
    provider: new GniHttpProvider({
      endpoint: 'https://gni.local/direct',
      fetchImpl: async () => ({
        ok: true,
        status: 202
      })
    })
  });

  const result = await bridge.processSessionBundle({ sessionBundle: REQUEST.payload });

  assert.equal(result.status, 'provider_empty');
  assert.equal(result.source, 'provider');
  assert.equal(result.directive, null);
  assert.deepEqual(result.errors, []);
});

test('GNI bridge captures HTTP provider errors without mutating gameplay state', async () => {
  const bridge = new GniBridge({
    provider: new GniHttpProvider({
      endpoint: 'https://gni.local/direct',
      fetchImpl: async () => ({
        ok: false,
        status: 500,
        async text() {
          return 'bad dream';
        }
      })
    })
  });

  const result = await bridge.processSessionBundle({ sessionBundle: REQUEST.payload });

  assert.equal(result.status, 'provider_error');
  assert.equal(result.source, 'provider');
  assert.equal(result.directive, null);
  assert.match(result.errors[0], /500: bad dream/);
});
