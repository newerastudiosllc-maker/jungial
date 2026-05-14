import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkGniContract,
  createDefaultGniContractRequest,
  parseGniContractCheckArgs
} from '../src/gniContractCheck.js';
import { createMockGniServer } from '../src/mockGniServer.js';

test('GNI contract check accepts immediate directive responses', async () => {
  const mock = createMockGniServer({
    directive: {
      dreamWeightDeltas: { garden: 0.25 },
      symbolEchoes: ['threshold']
    }
  });

  try {
    await mock.start();
    const report = await checkGniContract({
      endpoint: `${mock.url}/gni`
    });

    assert.equal(report.schema, 'GniContractCheckReportV1');
    assert.equal(report.ok, true);
    assert.equal(report.request.valid, true);
    assert.equal(report.response.status, 'directive_ready');
    assert.equal(report.response.directive.valid, true);
    assert.equal(report.response.directive.value.dreamWeightDeltas.garden, 0.25);
  } finally {
    await mock.stop();
  }
});

test('GNI contract check accepts async job responses and polls ready jobs', async () => {
  const mock = createMockGniServer({
    mode: 'async',
    directive: {
      dreamWeightDeltas: { mirror_hall: 0.3 },
      symbolEchoes: ['mirror']
    }
  });

  try {
    await mock.start();
    const report = await checkGniContract({
      endpoint: `${mock.url}/gni`,
      pollJob: true,
      maxPolls: 1
    });

    assert.equal(report.ok, true);
    assert.equal(report.response.status, 'provider_pending');
    assert.equal(report.response.providerJob.id, 'gni-job-001');
    assert.equal(report.job.status, 'directive_ready');
    assert.equal(report.job.directive.valid, true);
    assert.equal(report.job.directive.value.dreamWeightDeltas.mirror_hall, 0.3);
  } finally {
    await mock.stop();
  }
});

test('GNI contract check reports still-pending async jobs without failing the contract', async () => {
  const mock = createMockGniServer({
    mode: 'async',
    readyAfterPolls: 3,
    directive: {
      dreamWeightDeltas: { mirror_hall: 0.3 }
    }
  });

  try {
    await mock.start();
    const report = await checkGniContract({
      endpoint: `${mock.url}/gni`,
      pollJob: true,
      maxPolls: 1
    });

    assert.equal(report.ok, true);
    assert.equal(report.response.status, 'provider_pending');
    assert.equal(report.job.status, 'provider_pending');
    assert.equal(report.job.polls, 1);
  } finally {
    await mock.stop();
  }
});

test('GNI contract check CLI args and default request are provider-ready', () => {
  const args = parseGniContractCheckArgs([
    '--endpoint=https://gni.local/process',
    '--token-env=TEST_GNI_TOKEN',
    '--timeout-ms=2500',
    '--max-polls=2',
    '--request=fixtures/gni_request_v1.json',
    '--json'
  ]);
  const requestValidation = createDefaultGniContractRequest();

  assert.deepEqual(args, {
    endpoint: 'https://gni.local/process',
    tokenEnv: 'TEST_GNI_TOKEN',
    timeoutMs: 2500,
    maxPolls: 2,
    requestPath: 'fixtures/gni_request_v1.json',
    json: true
  });
  assert.equal(requestValidation.schema, 'GniProcessingRequestV1');
  assert.equal(requestValidation.contract.inputFormat, 'SessionBundleV1');
  assert.equal(requestValidation.contract.outputFormat, 'JungialDirectiveV1');
});
