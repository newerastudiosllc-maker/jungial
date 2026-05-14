import test from 'node:test';
import assert from 'node:assert/strict';

import { SymbolGrammar } from '../src/symbolGrammar.js';

test('symbol grammar tracks recurrence, tension, contradiction, and echoes', () => {
  const grammar = new SymbolGrammar();
  grammar.ingest({ symbols: ['mirror', 'portal'], vibeState: 'calm_hopeful_boundless_bright_warm' });
  grammar.ingest({ symbols: ['mirror', 'ash'], vibeState: 'tense_melancholic_confined_dim_cold' });

  const snapshot = grammar.snapshot();

  assert.equal(snapshot.recurrence.mirror, 2);
  assert.ok(snapshot.symbolicTension > 0);
  assert.deepEqual(snapshot.contradictions, ['bright_dark', 'calm_tense', 'expansive_confined', 'hopeful_melancholic', 'warm_cold']);
  assert.deepEqual(snapshot.echoes, ['mirror']);
});
