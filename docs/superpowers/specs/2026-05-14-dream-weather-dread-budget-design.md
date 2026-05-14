# Dream Weather And Dread Budget Design

## Goal

Add a hidden atmospheric director layer that makes Jungial feel larger than the player expected. The first version should create emergent climate shifts that mutate Passages, Dreamflow, masks, presentation packets, and GNI context without exposing the machinery to the player.

The player should feel that the dream has weather. They should not see weather stats, budgets, tables, scores, or tuning controls.

## Direction

Build both ideas over time:

- First: hidden emergent Dream Weather.
- Later: indirect ritual influence through spoken or chosen phrases.

At the start, players are surprised by what they have entered. They can set broad covenant boundaries, but the world still feels alive, strange, and not fully knowable.

## Player Experience

The player never sees the term `DreamWeather` or `DreadBudget`.

They notice:

- the room is colder than it should be
- a sound arrives before its source
- fog gathers near a symbol they keep avoiding
- a door returns with a different pressure
- a mask is felt before it appears
- the path seems to lean away
- beauty becomes too still
- horror arrives as atmosphere before it arrives as form

The world remains quiet. It does not explain why the weather changed.

## Naming Rules

Use dream-native names.

Allowed internal names:

- `DreamWeather`
- `WeatherVeil`
- `DreadBudget`
- `WeatherTrace`
- `WeatherGradient`
- `WeatherSeed`
- `RitualInfluence`
- `AtmosphericPressure`

Avoid names that make the layer feel like a clinical or explicit scoring system:

- trauma weather
- fear score
- panic budget
- psychological profile
- exposure level
- diagnosis pressure
- therapy weather

`DreadBudget` is allowed because it describes content pressure for game production and VR comfort, not a player diagnosis.

## Core Data Shapes

### DreamWeatherV1

```json
{
  "schema": "DreamWeatherV1",
  "schemaVersion": 1,
  "weatherTags": ["watching", "gravity", "static"],
  "pressure": 0.58,
  "temperature": "cold",
  "motion": "pulling",
  "visibility": "veiled",
  "texture": "electric",
  "dreadBudget": {
    "schema": "DreadBudgetV1",
    "schemaVersion": 1,
    "visualShock": 0.2,
    "audioShock": 0.15,
    "pursuit": 0,
    "bodyUnease": 0.25,
    "helplessness": 0.1,
    "cosmicDread": 0.65,
    "grief": 0.3,
    "isolation": 0.4
  }
}
```

### WeatherTraceV1

`WeatherTrace` is developer/QA context, not player-facing exposition.

```json
{
  "schema": "WeatherTraceV1",
  "schemaVersion": 1,
  "weatherTags": ["watching", "gravity", "static"],
  "sourceSignals": ["covenant.dark", "motif.void", "gesture.withdraw"],
  "suppressedTags": ["pursuit"],
  "pressureBeforeClamp": 0.71,
  "pressureAfterClamp": 0.58,
  "dreadBudget": {
    "visualShock": 0.2,
    "audioShock": 0.15,
    "pursuit": 0,
    "bodyUnease": 0.25,
    "helplessness": 0.1,
    "cosmicDread": 0.65,
    "grief": 0.3,
    "isolation": 0.4
  }
}
```

### RitualInfluenceV1

This is not part of the first implementation. It is the later steering surface.

```json
{
  "schema": "RitualInfluenceV1",
  "schemaVersion": 1,
  "phraseTags": ["colder", "deeper", "less_close"],
  "weatherDeltas": {
    "temperature": "cold",
    "pressure": -0.1,
    "tags": ["distance"]
  },
  "memoryScope": "session_only"
}
```

## Weather Tags

Initial weather tags:

- `stillness`
- `static`
- `pressure`
- `warmth`
- `rot`
- `gravity`
- `watching`
- `distance`
- `bloom`
- `echo`
- `hollow`
- `silver`

These tags are intentionally evocative rather than literal. They should map to presentation, Passage weighting, mask pressure, and journal tone without becoming exposition.

## Dread Budget Axes

Initial budget axes:

- `visualShock`
- `audioShock`
- `pursuit`
- `bodyUnease`
- `helplessness`
- `cosmicDread`
- `grief`
- `isolation`

The budget is not a player fear profile. It is a per-session content-pressure envelope. It lets horror exist while keeping exact pressure types inside the covenant and platform comfort rules.

## Generation Inputs

Dream Weather should be generated from:

- `SessionCovenantV1`
- recent `EchoTraceV1` entries
- `DreamerMemoryContextV1`
- current archetype vector
- current vibe state
- selected dream module
- active Passage
- Architect pacing profile
- seed
- optional normalized GNI directive

Do not require GNI for weather. GNI may nudge weather later, but local deterministic generation must work offline.

## Generation Rules

1. Start from a quiet default weather: `stillness`, low pressure, low budget values.
2. Add weather pressure from covenant tone tags.
3. Add motif pressure from the active Passage and selected dream module.
4. Add recurrence pressure from recent EchoTraces and Dreamer memory.
5. Add archetypal pressure from dominant archetype and coherence.
6. Apply hard boundary exclusions.
7. Reduce or reshape soft boundary pressure.
8. Clamp all DreadBudget axes under the Session Covenant intensity ceiling.
9. Keep exact output deterministic from seed and inputs.
10. Emit a developer-only WeatherTrace.

The clamp is important: weather can surprise the player within the agreed envelope, but it must not route around the covenant.

## Passage Mutation

Dream Weather should mutate Passage expression before it mutates Passage identity.

Example: `door_breathing_low`

- `warmth`: the door breathes softly and the air smells like dust in sunlight.
- `static`: the knocking arrives as radio hiss.
- `watching`: the door has no eye, but feels as if it looked away.
- `rot`: the frame is damp and flowering at the edges.
- `gravity`: the door is on the ceiling and pulling upward.
- `distance`: every step toward the door makes the room longer.
- `bloom`: keyholes open like flowers.

Implementation should not hard-code prose at first. Use tags and presentation hints so UE5 can later map them to lighting, fog, materials, audio, animation, and haptics.

## Presentation Effects

Dream Weather should feed renderer-facing packets, not mutate renderer state directly.

Suggested mapping:

- `stillness`: lower motion, longer silence windows
- `static`: audio texture, light flicker, brittle post-process
- `pressure`: denser fog, tighter movement feel
- `warmth`: warmer lights, softer bloom
- `rot`: green/brown material hints, damp fog
- `gravity`: camera-safe pull cues, object drift, lower movement responsiveness
- `watching`: subtle mask pressure, off-center audio
- `distance`: expanded scale, delayed echoes
- `bloom`: organic light, growth forms, gentle particle hints
- `hollow`: low reverb, reduced ambient detail

For VR, the presentation mapper must treat weather as comfort budgets. Sudden motion, hard flashes, audio spikes, forced pursuit, and helplessness must remain bounded.

## GNI Boundary

GNI may receive a redacted weather context:

- current weather tags
- pressure after clamp
- DreadBudget values
- suppressed tag names
- recent WeatherTrace summaries

GNI may return:

- weather tag nudges
- pressure deltas
- budget deltas
- symbolic echoes connected to weather

GNI may not return:

- executable behavior
- direct player diagnosis
- instructions to violate hard boundaries
- raw fear labels
- direct player-facing explanations of weather logic

All GNI weather output must be normalized and clamped before reaching gameplay systems.

## Persistence

Save session-level:

- current DreamWeather
- latest WeatherTrace
- recent weather tags
- accumulated budget deltas for this run

Save profile-level only as aggregates when profile memory is enabled:

- familiar weather tags
- familiar budget axes
- recurring weather/motif pairings

Do not store raw player speech as weather memory.

## Later Ritual Influence

Ritual influence should arrive after hidden weather works.

Players may later speak or choose phrases such as:

- "make it colder"
- "let it bloom"
- "not so close"
- "more beautiful"
- "deeper"
- "let it watch"
- "less teeth"

These should become `RitualInfluenceV1` inputs that nudge weather, not override it completely. The world should still feel alive.

## Safety And Product Boundaries

Horror is allowed. The first implementation should make horror possible through pressure and tags, not through explicit shocking content.

Rules:

- Hard boundary tags suppress matching pressure.
- Soft boundary tags reduce pressure and prefer indirect forms.
- Covenant ceiling clamps total pressure and DreadBudget axes.
- Explicit stop/return phrases belong to the existing grounding/return design path.
- No medical or therapeutic claims are produced by this layer.
- The Architect never speaks about weather directly.
- The Witness observes weather but does not explain it.

## UE5 VR And Console Notes

- `DreamWeatherV1` maps cleanly to a DataAsset-friendly struct plus runtime state.
- `DreadBudgetV1` should feed comfort-aware presentation curves.
- Weather must be deterministic with an injected seed or `FRandomStream`.
- Weather should be level-transition safe and SaveGame-backed.
- Speech influence is optional; controller and menu-neutral symbolic inputs should work.
- No weather effect should require a blocking network call.

## Testing

Add tests for:

- default weather generation
- covenant ceiling clamps pressure
- hard boundaries suppress matching weather/budget pressure
- soft boundaries reduce matching pressure
- deterministic weather from seed and inputs
- different EchoTrace inputs produce different weather
- Passage selection receives weather weighting
- GNI weather context is redacted
- normalized GNI weather deltas cannot exceed budget limits
- SaveGame validation accepts DreamWeather and WeatherTrace
- DreamerProfile stores only aggregate weather memory

## First Implementation Slice

1. Add `DreamWeatherV1`, `DreadBudgetV1`, and `WeatherTraceV1` model helpers.
2. Add schemas and validators.
3. Generate weather during simulation after Passage selection.
4. Feed weather into Passage selection scoring as an optional input.
5. Add redacted weather context to GNI requests.
6. Save weather and weather trace in session payloads.
7. Extend DreamerProfile with aggregate weather tags and budget-axis familiarity.
8. Export fixtures and update contract validation.
9. Add naming guardrails for explicit fear/diagnosis terms.

## Out Of Scope

- player-facing weather controls
- RitualInfluence implementation
- full visual/audio presentation curves
- UE5 rendering
- cloud memory
- clinical claims
- large horror content library

The first slice should make Jungial feel more alive without making the codebase too wide.
