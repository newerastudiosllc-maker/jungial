import { clampNumber, normalizeDirective } from './contracts.js';

export class WitnessState {
  constructor({ archetypeState, feelingState, room }) {
    this.archetypeState = archetypeState;
    this.feelingState = feelingState;
    this.room = room;
  }

  observeSpeech(text, symbols = []) {
    return this.archetypeState.recordSpeech(text, symbols);
  }

  observeAction(name, archetypes = [], symbols = []) {
    return this.archetypeState.recordAction(name, archetypes, symbols);
  }

  toSessionBundle({ selectedDream = null } = {}) {
    return {
      schema: 'SessionBundleV1',
      sessionId: `session_${Date.now()}`,
      dominantArchetype: this.archetypeState.dominantArchetype(),
      coherence: this.archetypeState.coherence,
      vibeState: this.feelingState.vibeState,
      recentSymbols: this.archetypeState.recentSymbols(),
      recentActions: this.archetypeState.recentActions(),
      roomConfigSnapshot: this.room.snapshot(),
      selectedDream,
      archetypeVector: { ...this.archetypeState.archetypeVector }
    };
  }
}

export class ArchitectState {
  constructor(snapshot = {}) {
    this.globalDreamWeights = { ...(snapshot.globalDreamWeights ?? {}) };
    this.symbolFrequency = { ...(snapshot.symbolFrequency ?? {}) };
    this.pacingProfile = snapshot.pacingProfile ?? {
      intensity: 0.2,
      repetition: 0.1,
      silence: 0.6
    };
    this.futureDreamModuleWeights = { ...(snapshot.futureDreamModuleWeights ?? {}) };
    this.maskPressure = { ...(snapshot.maskPressure ?? {}) };
  }

  update(sessionBundle) {
    for (const symbol of sessionBundle.recentSymbols ?? []) {
      this.symbolFrequency[symbol] = (this.symbolFrequency[symbol] ?? 0) + 1;
    }

    const selectedId = sessionBundle.selectedDream?.id;
    if (selectedId) {
      this.globalDreamWeights[selectedId] = (this.globalDreamWeights[selectedId] ?? 1) + 0.2;
    }

    for (const symbol of sessionBundle.selectedDream?.symbolicTags ?? []) {
      const key = `symbol:${symbol}`;
      this.futureDreamModuleWeights[key] = (this.futureDreamModuleWeights[key] ?? 1) + 0.1;
    }

    this.pacingProfile = {
      intensity: clamp01(this.pacingProfile.intensity + (sessionBundle.coherence > 0.55 ? 0.05 : -0.02)),
      repetition: clamp01(this.pacingProfile.repetition + 0.02),
      silence: clamp01(this.pacingProfile.silence - 0.01)
    };

    return {
      adjustedWeights: { ...this.globalDreamWeights },
      symbolFrequency: { ...this.symbolFrequency },
      maskPressure: { ...this.maskPressure },
      pacingProfile: { ...this.pacingProfile }
    };
  }

  applyDirective(rawDirective) {
    const directive = normalizeDirective(rawDirective);

    for (const [moduleId, delta] of Object.entries(directive.dreamWeightDeltas)) {
      const current = this.globalDreamWeights[moduleId] ?? 1;
      this.globalDreamWeights[moduleId] = round(Math.max(0.05, current + delta));
    }

    for (const symbol of directive.symbolEchoes) {
      this.symbolFrequency[symbol] = (this.symbolFrequency[symbol] ?? 0) + 1;
    }

    for (const [maskId, pressure] of Object.entries(directive.maskPressure)) {
      this.maskPressure[maskId] = round(clampNumber((this.maskPressure[maskId] ?? 0) + pressure, -1, 1));
    }

    this.pacingProfile = {
      intensity: round(clampNumber(this.pacingProfile.intensity + (directive.pacingDelta.intensity ?? 0), 0, 1)),
      repetition: round(clampNumber(this.pacingProfile.repetition + (directive.pacingDelta.repetition ?? 0), 0, 1)),
      silence: round(clampNumber(this.pacingProfile.silence + (directive.pacingDelta.silence ?? 0), 0, 1))
    };

    return {
      adjustedWeights: { ...this.globalDreamWeights },
      symbolFrequency: { ...this.symbolFrequency },
      maskPressure: { ...this.maskPressure },
      pacingProfile: { ...this.pacingProfile }
    };
  }

  snapshot() {
    return {
      globalDreamWeights: { ...this.globalDreamWeights },
      symbolFrequency: { ...this.symbolFrequency },
      pacingProfile: { ...this.pacingProfile },
      futureDreamModuleWeights: { ...this.futureDreamModuleWeights },
      maskPressure: { ...this.maskPressure }
    };
  }
}

export class GniAdapter {
  constructor({ endpoint = 'gni://placeholder', model = 'gni-dream-director-dev' } = {}) {
    this.endpoint = endpoint;
    this.model = model;
  }

  createProcessingRequest(sessionBundle) {
    // GNI is intentionally isolated here. The game emits stable context; GNI can
    // process it and later return directive data without owning mutable state.
    return {
      provider: 'GNI',
      endpoint: this.endpoint,
      model: this.model,
      contract: {
        inputFormat: 'SessionBundleV1',
        outputFormat: 'JungialDirectiveV1',
        allowedDirectives: [
          'adjust_dream_weights',
          'suggest_symbol_echo',
          'suggest_mask_pressure',
          'nudge_pacing'
        ]
      },
      payload: {
        sessionId: sessionBundle.sessionId,
        dominantArchetype: sessionBundle.dominantArchetype,
        vibeState: sessionBundle.vibeState,
        coherence: sessionBundle.coherence,
        recentSymbols: [...(sessionBundle.recentSymbols ?? [])],
        recentActions: [...(sessionBundle.recentActions ?? [])],
        roomConfigSnapshot: sessionBundle.roomConfigSnapshot ?? null,
        selectedDream: sessionBundle.selectedDream ?? null
      }
    };
  }

  parseDirective(response) {
    return normalizeDirective(response);
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function round(value) {
  return Number(value.toFixed(3));
}
