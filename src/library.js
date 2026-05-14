import { createSystemClock } from './clock.js';

export class JournalOfMirrors {
  constructor(snapshot = {}, { clock = createSystemClock() } = {}) {
    this.clock = clock;
    this.entries = [...(snapshot.entries ?? [])];
    this.lexiconOfSymbols = { ...(snapshot.lexiconOfSymbols ?? {}) };
    this.playerNotes = [...(snapshot.playerNotes ?? [])];
    this.unlockedBooks = [...(snapshot.unlockedBooks ?? [])];
  }

  writeReturnEntry({ symbols, actions, dominantArchetype, vibeState, journey = null, symbolGrammar = null }) {
    const symbolLine = symbols.slice(0, 4).join(', ') || 'no named thing';
    const actionLine = actions.slice(-3).join(', ') || 'standing still';
    const grammar = symbolGrammar?.snapshot?.();
    const echoLine = grammar?.echoes?.length ? ` ${grammar.echoes.join(', ')} returned before I did.` : '';
    const journeyLine = journey?.beats?.length
      ? ` ${journey.beats.map((beat) => beat.role).join(', ')} folded into one path.`
      : '';
    const text = [
      `I returned with ${symbolLine}.`,
      `The ${dominantArchetype} current moved beneath ${actionLine}.`,
      `The room remembered me as ${vibeState}.${journeyLine}${echoLine}`
    ].join(' ');

    const entry = {
      id: `journal_${String(this.entries.length + 1).padStart(3, '0')}`,
      title: `Mirror ${this.entries.length + 1}`,
      symbols: [...symbols],
      actions: [...actions],
      dominantArchetype,
      vibeState,
      text,
      createdAt: this.clock.nowIso()
    };

    this.entries.push(entry);
    for (const symbol of symbols) {
      this.lexiconOfSymbols[symbol] = this.lexiconOfSymbols[symbol] ?? {
        symbol,
        sightings: 0,
        note: 'Meaning waits for repetition.'
      };
      this.lexiconOfSymbols[symbol].sightings += 1;
    }

    return entry;
  }

  addPlayerNote(text) {
    const note = {
      id: `note_${String(this.playerNotes.length + 1).padStart(3, '0')}`,
      text,
      createdAt: this.clock.nowIso()
    };
    this.playerNotes.push(note);
    return note;
  }

  unlockBook(id, title) {
    if (!this.unlockedBooks.some((book) => book.id === id)) {
      this.unlockedBooks.push({ id, title });
    }
  }

  snapshot() {
    return {
      entries: this.entries.map((entry) => ({ ...entry })),
      lexiconOfSymbols: structuredClone(this.lexiconOfSymbols),
      playerNotes: this.playerNotes.map((note) => ({ ...note })),
      unlockedBooks: this.unlockedBooks.map((book) => ({ ...book }))
    };
  }
}
