import test from 'node:test';
import assert from 'node:assert/strict';

import { GniAdapter } from '../src/ai.js';
import { GniBridge } from '../src/gniBridge.js';

const VALID_BUNDLE = Object.freeze({
  schema: 'SessionBundleV1',
  schemaVersion: 1,
  sessionId: 'session-one',
  dominantArchetype: 'Seeker',
  coherence: 0.61,
  vibeState: 'calm_hopeful_boundless_bright_warm',
  recentSymbols: ['portal', 'light'],
  recentActions: ['open_portal'],
  roomConfigSnapshot: { awakened: true, portalOpen: true },
  selectedDream: {
    id: 'garden',
    symbolicTags: ['growth']
  },
  archetypeVector: { Seeker: 2, Creator: 1 }
});

test('GNI bridge validates session bundles before provider handoff', async () => {
  let providerCalled = false;
  const bridge = new GniBridge({
    provider: () => {
      providerCalled = true;
      return {};
    }
  });

  const result = await bridge.processSessionBundle({
    sessionBundle: { schema: 'WrongShape' }
  });

  assert.equal(providerCalled, false);
  assert.equal(result.status, 'invalid_session');
  assert.equal(result.directive, null);
  assert.ok(result.errors.includes('schema must be SessionBundleV1'));
});

test('GNI bridge routes stable requests to a provider and normalizes its directive', async () => {
  const seenRequests = [];
  const bridge = new GniBridge({
    adapter: new GniAdapter({ endpoint: 'gni://test-provider', model: 'gni-test' }),
    provider: {
      async processRequest(request) {
        seenRequests.push(request);
        return {
          dreamWeightDeltas: { garden: 9 },
          symbolEchoes: [' light ', '', 'mirror'],
          maskPressure: { double: 0.25 },
          pacingDelta: { intensity: 0.2, noise: 1 }
        };
      }
    }
  });

  const result = await bridge.processSessionBundle({ sessionBundle: VALID_BUNDLE });

  assert.equal(result.status, 'directive_ready');
  assert.equal(result.source, 'provider');
  assert.equal(seenRequests[0].schema, 'GniProcessingRequestV1');
  assert.equal(seenRequests[0].endpoint, 'gni://test-provider');
  assert.equal(seenRequests[0].payload.sessionId, 'session-one');
  assert.equal(result.directive.schema, 'JungialDirectiveV1');
  assert.equal(result.directive.dreamWeightDeltas.garden, 2);
  assert.deepEqual(result.directive.symbolEchoes, ['light', 'mirror']);
  assert.deepEqual(result.directive.pacingDelta, { intensity: 0.2 });
});

test('GNI bridge applies Firebreak before returning provider directives', async () => {
  const bridge = new GniBridge({
    provider: async () => ({
      dreamWeightDeltas: { garden: 1.4, pursuit: 0.5 },
      symbolEchoes: ['mirror', 'pursuit'],
      maskPressure: { double: 0.8 },
      pacingDelta: { intensity: 0.9 },
      rawTranscript: 'never store this'
    })
  });

  const result = await bridge.processSessionBundle({
    sessionBundle: {
      ...VALID_BUNDLE,
      sessionCovenant: {
        schema: 'SessionCovenantV1',
        schemaVersion: 1,
        mode: 'tonight_shape',
        toneTags: ['strange'],
        intensityCeiling: 0.35,
        hardBoundaryTags: ['real_world_self_harm', 'pursuit'],
        softBoundaryTags: [],
        allowedPressureTags: [],
        returnAnchor: { kind: 'image', value: 'small lamp' },
        groundingPreference: 'quiet_room',
        memoryScope: 'session_only'
      }
    }
  });

  assert.equal(result.status, 'directive_ready');
  assert.deepEqual(result.directive.dreamWeightDeltas, { garden: 0.35 });
  assert.deepEqual(result.directive.symbolEchoes, ['mirror']);
  assert.deepEqual(result.directive.maskPressure, { double: 0.35 });
  assert.deepEqual(result.directive.pacingDelta, { intensity: 0.35 });
  assert.equal(JSON.stringify(result).includes('never store this'), false);
  assert.equal(result.firebreakTrace.changed, true);
  assert.equal(result.firebreakTrace.suppressedCounts.symbolEchoes, 1);
});

test('GNI bridge can use explicit directives without calling a provider', async () => {
  let providerCalled = false;
  const bridge = new GniBridge({
    provider: () => {
      providerCalled = true;
      return {};
    }
  });

  const result = await bridge.processSessionBundle({
    sessionBundle: VALID_BUNDLE,
    providedDirective: {
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: { mirror_hall: 0.5 }
    }
  });

  assert.equal(providerCalled, false);
  assert.equal(result.status, 'directive_ready');
  assert.equal(result.source, 'provided');
  assert.equal(result.directive.dreamWeightDeltas.mirror_hall, 0.5);
});

test('GNI bridge falls back to deterministic emulation when requested', async () => {
  const first = await new GniBridge().processSessionBundle({
    sessionBundle: VALID_BUNDLE,
    emulate: true,
    seed: 'night-one'
  });
  const second = await new GniBridge().processSessionBundle({
    sessionBundle: VALID_BUNDLE,
    emulate: true,
    seed: 'night-one'
  });

  assert.equal(first.status, 'directive_ready');
  assert.equal(first.source, 'emulator');
  assert.deepEqual(first.directive, second.directive);
});

test('GNI bridge leaves a request pending when no provider or emulator is available', async () => {
  const result = await new GniBridge().processSessionBundle({ sessionBundle: VALID_BUNDLE });

  assert.equal(result.status, 'pending');
  assert.equal(result.source, 'none');
  assert.equal(result.directive, null);
  assert.equal(result.request.payload.sessionId, 'session-one');
});
