# Jungial Prototype Foundation Design

## Goal

Build a first playable prototype foundation for Jungial: a quiet Jungian dreamscape loop that begins in a silent Threshold Chamber, awakens from player input, opens a portal into a weighted dream module, returns, writes a journal entry, and updates long-range director state.

## Runtime Choice

Unreal Engine 5 is not available on PATH in this workspace, and no local C++ toolchain is available. The runnable slice will therefore be a dependency-free Node.js prototype with engine-agnostic modules and JSON data files. A small `UE5Port` folder will hold C++/Blueprint-style pseudocode interfaces that mirror the runtime boundaries for later porting into UE5 Actors, Components, DataAssets, SaveGame objects, and AI provider plugins.

## Core Boundary

Jungial game systems will not call GNI directly. They will emit structured context and consume structured directives through an `AiProvider` boundary:

- `WitnessState` observes local actions, speech, archetype shifts, and immediate atmosphere changes.
- `SessionBundle` is the compact handoff format from local play to global direction.
- `ArchitectState` updates global dream weights, symbol frequency, and pacing from the bundle.
- `GniAdapter` is a placeholder provider that can later serialize a bundle to GNI and parse GNI responses back into safe game directives.

This keeps the prototype playable today while leaving a clean slot for GNI as it matures.

## Systems

### Archetypal Resonance

The resonance model tracks the requested currents: Hero, Shadow, Anima, Animus, Sage, Trickster, Creator, Destroyer, Child, Mother, Father, Lover, and Seeker. Inputs add symbol hits, speech events, and action events. The vector is normalized enough for dominant-archetype selection, while `coherence` measures how centered or scattered the moment feels.

### Feeling Engine

The atmosphere state keeps five axes: `calm_tense`, `hopeful_melancholic`, `expansive_confined`, `bright_dark`, and `warm_cold`. These axes map to presentation placeholders for lighting, fog, bloom, exposure, ambient audio, and movement feel. The Node prototype prints these values; UE5 can later route them into light components, post-process volumes, audio parameters, and movement components.

### Threshold Chamber

The room begins dim, silent, and confined. A note reads `the word`. Player input awakens the Heartlight, blooms the atmosphere, reveals tool-sigils, and permits the Key of Portals to open a transition.

Tool-sigils:

- Key of Portals: opens dream transition.
- Glyph Quill: writes journal placeholder.
- Mirror Lens: changes visual mood.
- Lamp of Forms: spawns simple objects, lights, or mirrors.

### Dreamflow Generator

Dream modules are data driven and selected by weighted randomness using current archetype vector, vibe state, room configuration, and seed. Initial modules: Cabin, Garden, Boundless White Void, Space / Black Hole, and Mirror Hall.

### Library and Masks

The Library stub contains the Journal of Mirrors, Lexicon of Symbols, Player Notes, and Unlocked Books. Returning from a dream creates a compact poetic placeholder entry from recent symbols, recent actions, dominant archetype, and vibe state.

The shifting presence system defines masks that emerge from fog, light, or environment. Spawn checks use coherence and archetype affinity. The initial masks are Mirror Child, Ash-Faced One, Weaver, Jester of Glass, and Double.

### Persistence

Save/load uses JSON for room configuration, archetype vector, journal entries, and ArchitectState global weights.

## Playable Loop

1. Start in Threshold Chamber.
2. Receive speech/action input.
3. Heartlight awakens and atmosphere changes.
4. Tool-sigils appear.
5. Key of Portals opens a transition.
6. Dreamflow chooses a module.
7. Return generates a Journal of Mirrors entry.
8. Witness sends a SessionBundle.
9. Architect updates global weights.
10. Save state is written to JSON.

## Expansion Notes

The prototype should stay modest. The important production bet is the boundary shape: GNI receives bundles, not raw mutable game state, and returns constrained directives, not arbitrary code. That keeps future VR and console builds deterministic, testable, and safe to port.
