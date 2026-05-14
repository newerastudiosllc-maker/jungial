import { loadBundledContentCatalog } from './contentCatalog.js';
import { SeededRandom } from './random.js';

export class DreamflowGenerator {
  constructor({ seed = Date.now(), modules = loadBundledContentCatalog().dreamModules } = {}) {
    this.random = new SeededRandom(seed);
    this.modules = modules.map((module) => ({ ...module }));
  }

  selectNext({ archetypeState, feelingState, roomConfig }) {
    const scored = this.modules.map((module) => ({
      module,
      score: this.#scoreModule(module, archetypeState, feelingState, roomConfig)
    }));
    const selected = this.random.pickWeighted(scored, (entry) => entry.score.total);

    return {
      ...selected.item.module,
      weightBreakdown: {
        ...selected.item.score,
        roll: Number(selected.roll.toFixed(5))
      }
    };
  }

  #scoreModule(module, archetypeState, feelingState, roomConfig) {
    let archetype = 0;
    for (const [name, affinity] of Object.entries(module.archetypeAffinities ?? {})) {
      archetype += (archetypeState.archetypeVector[name] ?? 0) * affinity;
    }

    let vibe = 0;
    for (const [axis, affinity] of Object.entries(module.vibeAffinities ?? {})) {
      vibe += (feelingState.axes[axis] ?? 0) * affinity;
    }

    const room = roomConfig.boundaryState === 'boundless' ? 0.25 : 0;
    const portal = roomConfig.portalOpen ? 0.35 : 0;
    const total = Math.max(0.05, module.baseWeight + archetype + vibe + room + portal);

    return {
      base: module.baseWeight,
      archetype: Number(archetype.toFixed(3)),
      vibe: Number(vibe.toFixed(3)),
      room: Number(room.toFixed(3)),
      portal: Number(portal.toFixed(3)),
      total: Number(total.toFixed(3))
    };
  }
}
