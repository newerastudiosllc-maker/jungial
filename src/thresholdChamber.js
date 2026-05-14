import { loadBundledContentCatalog } from './contentCatalog.js';

export class ThresholdChamber {
  constructor(snapshot = {}) {
    this.toolSigils = (snapshot.toolSigils ?? loadBundledContentCatalog().toolSigils).map((tool) => ({ ...tool }));
    this.note = snapshot.note ?? 'the word';
    this.awakened = snapshot.awakened ?? false;
    this.boundaryState = snapshot.boundaryState ?? 'confined';
    this.portalOpen = snapshot.portalOpen ?? false;
    this.heartlight = snapshot.heartlight ?? {
      awake: false,
      intensity: 0.05,
      color: 'low ember'
    };
    this.visibleToolSigils = snapshot.visibleToolSigils ?? [];
    this.spawnedForms = snapshot.spawnedForms ?? [];
  }

  receiveInput({ kind, text = '', archetypes, feeling }) {
    const speaksWord = kind === 'speech' && text.trim().toLowerCase().includes(this.note);

    if (speaksWord || kind === 'action') {
      this.awakened = true;
      this.boundaryState = 'boundless';
      this.heartlight = {
        awake: true,
        intensity: 1,
        color: 'pearl-gold placeholder'
      };
      this.visibleToolSigils = this.toolSigils.map((tool) => ({ ...tool }));

      archetypes?.recordSpeech(text || 'unspoken pressure', ['threshold', 'silence', 'light']);
      archetypes?.recordAction('awaken_heartlight', ['Creator', 'Seeker'], ['awakening', 'light']);
      feeling?.nudge({
        calm_tense: -0.2,
        hopeful_melancholic: 0.25,
        expansive_confined: 0.7,
        bright_dark: 0.55,
        warm_cold: -0.25
      });
      archetypes?.bindRoomSnapshot(this.snapshot());
    }

    return this.snapshot();
  }

  openPortal(toolId) {
    const hasKey = this.visibleToolSigils.some((tool) => tool.id === toolId && tool.id === 'key_of_portals');
    this.portalOpen = this.awakened && hasKey;
    return this.snapshot();
  }

  useTool(toolId) {
    if (toolId === 'mirror_lens') {
      this.heartlight.color = 'silver-blue placeholder';
    }

    if (toolId === 'lamp_of_forms') {
      this.spawnedForms.push({
        id: `form_${this.spawnedForms.length + 1}`,
        kind: 'light_or_mirror_placeholder'
      });
    }

    return this.snapshot();
  }

  snapshot() {
    return {
      note: this.note,
      awakened: this.awakened,
      boundaryState: this.boundaryState,
      portalOpen: this.portalOpen,
      heartlight: { ...this.heartlight },
      visibleToolSigils: this.visibleToolSigils.map((tool) => ({ ...tool })),
      spawnedForms: this.spawnedForms.map((form) => ({ ...form }))
    };
  }
}
