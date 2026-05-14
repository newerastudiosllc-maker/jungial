import { SeededRandom } from './random.js';

export class MaskRegistry {
  constructor({ seed = Date.now(), masks } = {}) {
    if (!Array.isArray(masks)) {
      throw new Error('MaskRegistry requires masks from a content catalog');
    }

    this.random = new SeededRandom(seed);
    this.masks = masks.map((mask) => ({ ...mask }));
  }

  selectEligibleMask(archetypeState) {
    const eligible = this.masks
      .map((mask) => ({ mask, weight: this.#weight(mask, archetypeState) }))
      .filter((entry) => entry.weight > 0);

    if (eligible.length === 0) {
      return null;
    }

    const selected = this.random.pickWeighted(eligible, (entry) => entry.weight);
    return {
      ...selected.item.mask,
      spawnTrigger: {
        coherence: archetypeState.coherence,
        matchedArchetypes: selected.item.mask.archetypeTags.filter(
          (tag) => (archetypeState.archetypeVector[tag] ?? 0) > 0
        )
      }
    };
  }

  #weight(mask, archetypeState) {
    if (archetypeState.coherence < mask.minCoherence) {
      return 0;
    }

    return mask.archetypeTags.reduce(
      (sum, tag) => sum + (archetypeState.archetypeVector[tag] ?? 0),
      0
    );
  }
}
