import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('UE5 GNI pseudocode documents async provider job polling and queue trace output', async () => {
  const text = await readFile('UE5Port/JungialAiProvider.hpp', 'utf8');

  assert.match(text, /struct FGniProviderJobV1/);
  assert.match(text, /struct FGniFirebreakTraceV1/);
  assert.match(text, /GNI Firebreak/);
  assert.match(text, /PollProviderJob/);
  assert.match(text, /gni\.queue\.processed/);
  assert.match(text, /gni\.firebreak\.applied/);
});

test('UE5 core type pseudocode documents save slot incarnation contracts', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FSaveSlotPlanV1/);
  assert.match(text, /Fresh/);
  assert.match(text, /NewIncarnation/);
  assert.match(text, /DreamerMemoryContext/);
});
