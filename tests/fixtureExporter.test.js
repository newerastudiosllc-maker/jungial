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
      'gni_request_v1.json',
      'gni_directive_v1.json',
      'trace_summary_v1.json'
    ]);
    assert.match(manifest.hash, /^[a-f0-9]{64}$/);

    const bundle = JSON.parse(await readFile(join(dir, 'session_bundle_v1.json'), 'utf8'));
    const request = JSON.parse(await readFile(join(dir, 'gni_request_v1.json'), 'utf8'));
    const directive = JSON.parse(await readFile(join(dir, 'gni_directive_v1.json'), 'utf8'));

    assert.equal(bundle.schema, 'SessionBundleV1');
    assert.equal(bundle.schemaVersion, 1);
    assert.equal(request.schema, 'GniProcessingRequestV1');
    assert.equal(request.schemaVersion, 1);
    assert.equal(request.contract.outputFormat, 'JungialDirectiveV1');
    assert.equal(directive.schema, 'JungialDirectiveV1');
    assert.equal(directive.schemaVersion, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
