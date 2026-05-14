import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('UE5 GNI pseudocode documents async provider job polling and queue trace output', async () => {
  const text = await readFile('UE5Port/JungialAiProvider.hpp', 'utf8');

  assert.match(text, /struct FGniProviderJobV1/);
  assert.match(text, /PollProviderJob/);
  assert.match(text, /gni\.queue\.processed/);
});
