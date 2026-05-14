const VIBE_GROUPS = Object.freeze({
  calm_tense: ['calm', 'tense'],
  hopeful_melancholic: ['hopeful', 'melancholic'],
  expansive_confined: ['boundless', 'confined'],
  bright_dark: ['bright', 'dim'],
  warm_cold: ['warm', 'cold']
});

export class SymbolGrammar {
  constructor(snapshot = {}) {
    this.recurrence = { ...(snapshot.recurrence ?? {}) };
    this.vibeSeen = structuredClone(snapshot.vibeSeen ?? {});
  }

  ingest({ symbols = [], vibeState = '' }) {
    for (const symbol of symbols) {
      this.recurrence[symbol] = (this.recurrence[symbol] ?? 0) + 1;
    }

    const parts = new Set(String(vibeState).split('_'));
    for (const [axis, tokens] of Object.entries(VIBE_GROUPS)) {
      this.vibeSeen[axis] = this.vibeSeen[axis] ?? [];
      for (const token of tokens) {
        if (parts.has(token) && !this.vibeSeen[axis].includes(token)) {
          this.vibeSeen[axis].push(token);
        }
      }
    }
  }

  snapshot() {
    const contradictions = Object.entries(this.vibeSeen)
      .filter(([, tokens]) => tokens.length > 1)
      .map(([axis]) => axis)
      .sort();
    const echoes = Object.entries(this.recurrence)
      .filter(([, count]) => count > 1)
      .map(([symbol]) => symbol)
      .sort();

    return {
      recurrence: { ...this.recurrence },
      symbolicTension: contradictions.length + echoes.length * 0.5,
      contradictions,
      echoes
    };
  }
}
