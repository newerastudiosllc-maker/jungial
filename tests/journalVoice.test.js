import test from 'node:test';
import assert from 'node:assert/strict';

import { JournalOfMirrors } from '../src/library.js';
import { SymbolGrammar } from '../src/symbolGrammar.js';

test('journal voice stays poetic while grounding entries in journey and symbol echoes', () => {
  const grammar = new SymbolGrammar();
  grammar.ingest({ symbols: ['mirror', 'portal'], vibeState: 'calm_hopeful_boundless_bright_warm' });
  grammar.ingest({ symbols: ['mirror'], vibeState: 'tense_melancholic_confined_dim_cold' });
  const journal = new JournalOfMirrors();

  const entry = journal.writeReturnEntry({
    symbols: ['mirror', 'portal'],
    actions: ['open_portal'],
    dominantArchetype: 'Seeker',
    vibeState: 'tense_melancholic_confined_dim_cold',
    journey: {
      beats: [{ role: 'entry' }, { role: 'pressure' }, { role: 'mirror' }, { role: 'return' }]
    },
    symbolGrammar: grammar
  });

  assert.match(entry.text, /entry, pressure, mirror, return/);
  assert.match(entry.text, /mirror returned before I did/);
  assert.equal(entry.text.includes('means'), false);
  assert.equal(entry.text.includes('you should'), false);
});
