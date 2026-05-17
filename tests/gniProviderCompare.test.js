import test from 'node:test';
import assert from 'node:assert/strict';

import { createDefaultGniContractRequest } from '../src/gniContractCheck.js';
import { validateContractDocument } from '../src/contractValidator.js';
import {
  compareGniProvider,
  parseGniProviderCompareArgs
} from '../src/gniProviderCompare.js';

test('GNI provider comparison runs emulator and provider without applying directives', async () => {
  const request = createDefaultGniContractRequest();
  let seenRequest = null;

  const report = await compareGniProvider({
    request,
    emulatorSeed: 42,
    provider: {
      async processRequest(providerRequest) {
        seenRequest = providerRequest;
        return {
          schema: 'JungialDirectiveV1',
          schemaVersion: 1,
          dreamWeightDeltas: { garden: 0.1, mirror_hall: 0.2 },
          symbolEchoes: ['threshold', 'mirror'],
          maskPressure: { double: 0.1 },
          pacingDelta: { repetition: 0.2 }
        };
      }
    }
  });

  assert.equal(report.schema, 'GniProviderComparisonReportV1');
  assert.equal(report.ok, true);
  assert.equal(report.applied, false);
  assert.equal(seenRequest, request);
  assert.equal(report.emulator.status, 'directive_ready');
  assert.equal(report.provider.status, 'directive_ready');
  assert.equal(report.diff.matches, false);
  assert.equal(report.diff.dreamWeightDeltas.changed.some((entry) => entry.key === 'garden'), true);
  assert.equal(report.diff.symbolEchoes.onlyProvider.includes('mirror'), true);
  assert.deepEqual(validateContractDocument(report), { valid: true, errors: [] });
});

test('GNI provider comparison reports pending providers without diffing directives', async () => {
  const report = await compareGniProvider({
    request: createDefaultGniContractRequest(),
    provider: {
      async processRequest() {
        return {
          schema: 'GniProviderPendingV1',
          status: 'pending',
          providerJob: { id: 'job-one', statusUrl: 'https://gni.local/jobs/job-one' }
        };
      }
    }
  });

  assert.equal(report.ok, true);
  assert.equal(report.emulator.status, 'directive_ready');
  assert.equal(report.provider.status, 'provider_pending');
  assert.equal(report.provider.providerJob.id, 'job-one');
  assert.equal(report.diff, null);
});

test('GNI provider comparison rejects invalid requests before calling providers', async () => {
  let called = false;
  const report = await compareGniProvider({
    request: { schema: 'BadRequest' },
    provider: {
      async processRequest() {
        called = true;
        return {};
      }
    }
  });

  assert.equal(report.ok, false);
  assert.equal(report.request.valid, false);
  assert.equal(report.emulator, null);
  assert.equal(report.provider, null);
  assert.equal(called, false);
});

test('GNI provider comparison CLI args parse endpoint, request, token, and emulator seed', () => {
  const args = parseGniProviderCompareArgs([
    '--endpoint=https://gni.local/process',
    '--token-env=GNI_TEST_TOKEN',
    '--timeout-ms=2500',
    '--request=fixtures/gni_request_v1.json',
    '--emulator-seed=404',
    '--json'
  ]);

  assert.deepEqual(args, {
    endpoint: 'https://gni.local/process',
    tokenEnv: 'GNI_TEST_TOKEN',
    timeoutMs: 2500,
    requestPath: 'fixtures/gni_request_v1.json',
    emulatorSeed: 404,
    json: true
  });
});
