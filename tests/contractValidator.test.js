import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { validateContractDocument, validateContractFiles } from '../src/contractValidator.js';

test('contract validator routes known Jungial contract schemas', () => {
  const directiveResult = validateContractDocument({
    schema: 'JungialDirectiveV1',
    schemaVersion: 1,
    dreamWeightDeltas: { garden: 0.2 },
    symbolEchoes: [],
    maskPressure: {},
    pacingDelta: {}
  });
  const traceResult = validateContractDocument({
    schema: 'JungialTraceV1',
    runId: 'trace-one',
    entries: [{
      index: 1,
      at: '2080-01-01T00:00:00.000Z',
      type: 'gni.queue.processed',
      payload: { statusCounts: { directive_ready: 1 } }
    }]
  });
  const gniContractCheckResult = validateContractDocument({
    schema: 'GniContractCheckReportV1',
    ok: true,
    endpoint: 'https://gni.local/process',
    request: {
      valid: true,
      errors: [],
      value: {
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
          archetypeVector: { Seeker: 1 }
        }
      }
    },
    response: { status: 'provider_empty', errors: [] },
    job: null
  });
  const dreamerProfileResult = validateContractDocument({
    schema: 'DreamerProfileV1',
    schemaVersion: 1,
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one',
    createdAt: '2080-01-01T00:00:00.000Z',
    updatedAt: '2080-01-01T00:00:00.000Z',
    consent: { profileMemory: true, crossSaveEchoes: false },
    memory: {
      sessionCount: 0,
      symbols: {},
      archetypes: {},
      actions: {},
      dreamModules: {},
      masks: {},
      vibeStates: {},
      lastSessionDigest: null
    }
  });

  assert.deepEqual(directiveResult, { valid: true, errors: [] });
  assert.deepEqual(traceResult, { valid: true, errors: [] });
  assert.deepEqual(gniContractCheckResult, { valid: true, errors: [] });
  assert.deepEqual(dreamerProfileResult, { valid: true, errors: [] });
});

test('contract validator validates save game payload and nested GNI state', () => {
  const result = validateContractDocument({
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    migrations: [],
    payload: {
      room: { awakened: true },
      archetypeState: { archetype_vector: { Seeker: 1 } },
      feelingState: { vibe_state: 'calm_hopeful_boundless_bright_warm' },
      journal: { entries: [] },
      architectState: { globalDreamWeights: {} },
      gniQueue: {
        schema: 'GniDirectiveQueueV1',
        pending: 'not-an-array',
        resolved: []
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['payload.gniQueue.pending must be an array']);
});

test('contract validator requires save game migration metadata', () => {
  const result = validateContractDocument({
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    payload: {
      room: {},
      archetypeState: {},
      feelingState: {},
      journal: {},
      architectState: {}
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['migrations must be an array']);
});

test('contract validator reports unsupported schemas and file-level failures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-contracts-'));
  const validPath = join(dir, 'directive.json');
  const invalidPath = join(dir, 'unknown.json');

  try {
    await writeFile(validPath, JSON.stringify({
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: { garden: 0.2 }
    }));
    await writeFile(invalidPath, JSON.stringify({ schema: 'UnknownThing' }));

    const report = await validateContractFiles([validPath, invalidPath]);

    assert.equal(report.schema, 'JungialContractValidationReportV1');
    assert.equal(report.ok, false);
    assert.equal(report.files[0].valid, true);
    assert.equal(report.files[1].valid, false);
    assert.deepEqual(report.files[1].errors, ['unsupported contract schema: UnknownThing']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
