import { SeededRandom } from './random.js';

export class DreamflowGenerator {
  constructor({ seed = Date.now(), modules } = {}) {
    if (!Array.isArray(modules)) {
      throw new Error('DreamflowGenerator requires dream modules from a content catalog');
    }

    this.random = new SeededRandom(seed);
    this.modules = modules.map((module) => ({ ...module }));
  }

  scoreModules({ archetypeState, feelingState, roomConfig, weightOverrides = {} }) {
    return this.modules.map((module) => ({
      id: module.id,
      name: module.name,
      module,
      weightBreakdown: this.#scoreModule(module, archetypeState, feelingState, roomConfig, weightOverrides)
    }));
  }

  selectNext({ archetypeState, feelingState, roomConfig, weightOverrides = {} }) {
    const scored = this.scoreModules({ archetypeState, feelingState, roomConfig, weightOverrides });
    const selected = this.random.pickWeighted(scored, (entry) => entry.weightBreakdown.total);

    return {
      ...selected.item.module,
      weightBreakdown: {
        ...selected.item.weightBreakdown,
        roll: Number(selected.roll.toFixed(5))
      }
    };
  }

  #scoreModule(module, archetypeState, feelingState, roomConfig, weightOverrides) {
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
    const rawTotal = Math.max(0.05, module.baseWeight + archetype + vibe + room + portal);
    const directorMultiplier = Math.max(0.05, weightOverrides[module.id] ?? 1);
    const total = rawTotal * directorMultiplier;

    return {
      base: module.baseWeight,
      archetype: Number(archetype.toFixed(3)),
      vibe: Number(vibe.toFixed(3)),
      room: Number(room.toFixed(3)),
      portal: Number(portal.toFixed(3)),
      directorMultiplier: Number(directorMultiplier.toFixed(3)),
      total: Number(total.toFixed(3))
    };
  }
}
