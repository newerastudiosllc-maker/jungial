import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { exportContractFixtures } from '../src/fixtureExporter.js';

test('fixture exporter writes stable GNI handoff fixtures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-fixtures-'));

  try {
    const manifest = await exportContractFixtures({
      outDir: dir,
      seed: 777,
      clockStartIso: '2060-01-01T00:00:00.000Z'
    });

    assert.deepEqual(manifest.files, [
      'session_bundle_v1.json',
      'session_covenant_v1.json',
      'passage_v1.json',
      'echo_trace_v1.json',
      'dreamer_profile_v1.json',
      'dreamer_memory_context_v1.json',
      'dream_weather_v1.json',
      'weather_trace_v1.json',
      'gni_request_v1.json',
      'gni_directive_v1.json',
      'gni_bridge_result_v1.json',
      'gni_contract_check_report_v1.json',
      'gni_directive_queue_v1.json',
      'gni_queue_process_result_v1.json',
      'fixture-run.save.json',
      'fixture-pending-run.save.json',
      'trace_summary_v1.json'
    ]);
    assert.match(manifest.hash, /^[a-f0-9]{64}$/);

    const bundle = JSON.parse(await readFile(join(dir, 'session_bundle_v1.json'), 'utf8'));
    const covenant = JSON.parse(await readFile(join(dir, 'session_covenant_v1.json'), 'utf8'));
    const passage = JSON.parse(await readFile(join(dir, 'passage_v1.json'), 'utf8'));
    const echoTrace = JSON.parse(await readFile(join(dir, 'echo_trace_v1.json'), 'utf8'));
    const dreamerProfile = JSON.parse(await readFile(join(dir, 'dreamer_profile_v1.json'), 'utf8'));
    const memoryContext = JSON.parse(await readFile(join(dir, 'dreamer_memory_context_v1.json'), 'utf8'));
    const dreamWeather = JSON.parse(await readFile(join(dir, 'dream_weather_v1.json'), 'utf8'));
    const weatherTrace = JSON.parse(await readFile(join(dir, 'weather_trace_v1.json'), 'utf8'));
    const request = JSON.parse(await readFile(join(dir, 'gni_request_v1.json'), 'utf8'));
    const directive = JSON.parse(await readFile(join(dir, 'gni_directive_v1.json'), 'utf8'));
    const bridgeResult = JSON.parse(await readFile(join(dir, 'gni_bridge_result_v1.json'), 'utf8'));
    const contractCheck = JSON.parse(await readFile(join(dir, 'gni_contract_check_report_v1.json'), 'utf8'));
    const queue = JSON.parse(await readFile(join(dir, 'gni_directive_queue_v1.json'), 'utf8'));
    const processResult = JSON.parse(await readFile(join(dir, 'gni_queue_process_result_v1.json'), 'utf8'));

    assert.equal(bundle.schema, 'SessionBundleV1');
    assert.equal(bundle.schemaVersion, 1);
    assert.equal(covenant.schema, 'SessionCovenantV1');
    assert.equal(passage.schema, 'PassageV1');
    assert.equal(echoTrace.schema, 'EchoTraceV1');
    assert.equal(dreamerProfile.schema, 'DreamerProfileV1');
    assert.equal(memoryContext.schema, 'DreamerMemoryContextV1');
    assert.equal(memoryContext.profileId, null);
    assert.equal(dreamWeather.schema, 'DreamWeatherV1');
    assert.equal(dreamWeather.schemaVersion, 1);
    assert.equal(typeof dreamWeather.dreadBudget, 'object');
    assert.equal(weatherTrace.schema, 'WeatherTraceV1');
    assert.equal(weatherTrace.schemaVersion, 1);
    assert.equal(weatherTrace.weatherId, dreamWeather.weatherId);
    assert.equal(request.schema, 'GniProcessingRequestV1');
    assert.equal(request.schemaVersion, 1);
    assert.equal(request.contract.outputFormat, 'JungialDirectiveV1');
    assert.equal(directive.schema, 'JungialDirectiveV1');
    assert.equal(directive.schemaVersion, 1);
    assert.equal(bridgeResult.schema, 'GniBridgeResultV1');
    assert.equal(bridgeResult.status, 'directive_ready');
    assert.equal(bridgeResult.request.schema, 'GniProcessingRequestV1');
    assert.equal(bridgeResult.directive.schema, 'JungialDirectiveV1');
    assert.equal(contractCheck.schema, 'GniContractCheckReportV1');
    assert.equal(contractCheck.ok, true);
    assert.equal(contractCheck.response.status, 'directive_ready');
    assert.equal(queue.schema, 'GniDirectiveQueueV1');
    assert.equal(queue.pending.length, 1);
    assert.equal(processResult.schema, 'GniDirectiveQueueProcessResultV1');
    assert.equal(processResult.processed[0].status, 'directive_ready');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
