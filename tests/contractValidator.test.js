import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { validateContractDocument, validateContractFiles } from '../src/contractValidator.js';

test('contract validator routes known Jungial contract schemas', () => {
  const result = validateContractDocument({
    schema: 'JungialDirectiveV1',
    schemaVersion: 1,
    dreamWeightDeltas: { garden: 0.2 },
    symbolEchoes: [],
    maskPressure: {},
    pacingDelta: {}
  });

  assert.deepEqual(result, { valid: true, errors: [] });
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
