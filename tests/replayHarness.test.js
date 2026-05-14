import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runReplay } from '../src/replay.js';

test('replay harness produces deterministic dream, journal, and architect outcomes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-replay-'));

  try {
    const script = {
      seed: 44,
      inputs: [
        { kind: 'speech', text: 'the word' },
        { kind: 'action', name: 'open_portal', archetypes: ['Seeker'], symbols: ['portal'] }
      ],
      gniDirectives: [
        {
          schema: 'JungialDirectiveV1',
          schemaVersion: 1,
          dreamWeightDeltas: { mirror_hall: 0.25 },
          symbolEchoes: ['mirror'],
          maskPressure: { double: 0.2 },
          pacingDelta: { intensity: 0.1 }
        }
      ]
    };

    const first = await runReplay({ script, savePath: join(dir, 'first.json') });
    const second = await runReplay({ script, savePath: join(dir, 'second.json') });

    assert.equal(first.selectedDream.id, second.selectedDream.id);
    assert.equal(first.journalEntry.text, second.journalEntry.text);
    assert.deepEqual(first.architectState, second.architectState);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('replay harness accepts platform-neutral input intents', async () => {
  const script = {
    seed: 44,
    inputs: [
      { source: 'controller', kind: 'action', name: 'speak_word' },
      { source: 'controller', kind: 'tool', toolId: 'key_of_portals' }
    ]
  };

  const result = await runReplay({ script });

  assert.equal(result.sessionBundle.roomConfigSnapshot.portalOpen, true);
  assert.equal(result.sessionBundle.roomConfigSnapshot.awakened, true);
  assert.equal(result.transcript.includes('intent:awaken_threshold'), true);
  assert.equal(result.transcript.includes('intent:open_portal'), true);
});
