import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const forbidden = [
  /traumaTrial/i,
  /psychAssessment/i,
  /therapyEngine/i,
  /playerDiagnosis/i,
  /behaviorScore/i,
  /mirrorSession/i
];

const runtimeFiles = [
  'src/sessionCovenant.js',
  'src/passageLattice.js',
  'src/simulation.js',
  'src/ai.js',
  'src/dreamerProfile.js'
];

test('runtime naming stays dream-native for adaptive Passage systems', async () => {
  for (const file of runtimeFiles) {
    const text = await readFile(join(process.cwd(), file), 'utf8');
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${file} contains ${pattern}`);
    }
  }
});
