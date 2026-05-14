import { FEELING_AXES } from './constants.js';

export class FeelingState {
  constructor(snapshot = {}) {
    this.axes = Object.fromEntries(
      FEELING_AXES.map((axis) => [axis, clamp(snapshot.axes?.[axis] ?? 0)])
    );
    this.vibeState = snapshot.vibe_state ?? this.#computeVibeState();
  }

  nudge(delta) {
    for (const [axis, value] of Object.entries(delta)) {
      if (axis in this.axes) {
        this.axes[axis] = clamp(this.axes[axis] + value);
      }
    }
    this.vibeState = this.#computeVibeState();
    return this;
  }

  toPresentationParams() {
    const tense = positive(this.axes.calm_tense);
    const melancholic = negative(this.axes.hopeful_melancholic);
    const boundless = positive(this.axes.expansive_confined);
    const dim = negative(this.axes.bright_dark);
    const warm = negative(this.axes.warm_cold);

    return {
      lighting: {
        intensity: round(1 + this.axes.bright_dark * 0.65 - tense * 0.2),
        colorTemperature: round(6500 + this.axes.warm_cold * 2200),
        placeholder: 'UE LightComponent intensity/color'
      },
      fog: {
        density: round(0.35 + tense * 0.25 - boundless * 0.2 + melancholic * 0.1),
        placeholder: 'UE ExponentialHeightFog density'
      },
      postProcess: {
        bloom: round(0.4 + positive(this.axes.bright_dark) * 0.5 + boundless * 0.2),
        exposure: round(0.9 + this.axes.bright_dark * 0.4),
        placeholder: 'UE PostProcessVolume bloom/exposure'
      },
      audio: {
        parameterMood: this.vibeState,
        placeholder: `ambient_${this.vibeState}`
      },
      movement: {
        feel: boundless > 0.4 ? 'drifting, slow acceleration placeholder' : 'close, careful footfall placeholder',
        gravityScale: round(1 - boundless * 0.25 + tense * 0.1)
      },
      thermalHint: warm > 0.1 ? 'warm' : 'cold'
    };
  }

  snapshot() {
    return {
      axes: { ...this.axes },
      vibe_state: this.vibeState
    };
  }

  #computeVibeState() {
    return [
      this.axes.calm_tense >= 0 ? 'tense' : 'calm',
      this.axes.hopeful_melancholic >= 0 ? 'hopeful' : 'melancholic',
      this.axes.expansive_confined >= 0 ? 'boundless' : 'confined',
      this.axes.bright_dark >= 0 ? 'bright' : 'dim',
      this.axes.warm_cold >= 0 ? 'cold' : 'warm'
    ].join('_');
  }
}

function clamp(value) {
  return Math.max(-1, Math.min(1, Number(value)));
}

function positive(value) {
  return Math.max(0, value);
}

function negative(value) {
  return Math.max(0, -value);
}

function round(value) {
  return Number(value.toFixed(3));
}
