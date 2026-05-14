# Session Covenant And Passage Lattice Design

## Goal

Give Jungial a subtle intro and adaptive encounter architecture that can support gentle, strange, dark, horrific, beautiful, cathartic, or chaotic sessions without repeating itself or exposing the machinery to the player.

The player should never see terms like test, trial, assessment, diagnosis, or therapy protocol. The world should feel like it listens through symbols, choices, speech, silence, hesitation, return, refusal, and transformation.

## Product Promise

Jungial may become creepy, strange, or horrific when the player invites that intensity. It should not ambush players with content they clearly marked as outside their boundary.

The experience language is:

- The room listens.
- The world remembers shapes, not explanations.
- Repeated symbols return changed.
- The player can always return, stop, soften, reset, or begin again.

The account/settings language can be clearer:

- Jungial remembers symbolic choices and session preferences.
- Players can disable, reset, delete, or export profile memory.
- Players can set intensity and boundaries before a session.
- Jungial is reflective dreamwork and symbolic exploration unless clinical/legal review later approves stronger claims.

This follows the direction of trauma-informed principles such as safety, transparency, voice, choice, and resisting retraumatization described by SAMHSA: https://www.samhsa.gov/mental-health/trauma-violence/trauma-informed-approaches-programs

Because session preferences may become sensitive personal data, production planning should also treat privacy and breach duties seriously, including FTC health-app guidance where applicable: https://www.ftc.gov/tips-advice/business-center/guidance/complying-ftcs-health-breach-notification-rule

For crisis support boundaries in the United States, external help surfaces should be able to route players toward the 988 Suicide & Crisis Lifeline rather than letting the in-world voice pretend to handle crisis care: https://988lifeline.org/about/

## Naming Rules

The implementation should use dream-native language only.

Allowed internal names:

- `SessionCovenant`
- `FirstListening`
- `TonightShape`
- `Passage`
- `PassageLattice`
- `EchoThread`
- `EchoTrace`
- `ReturnAnchor`
- `DreamTide`
- `VariationLattice`
- `BoundarySigil`

Avoid internal and player-facing names that imply testing, diagnosis, therapy protocol, or behavioral scoring. Do not name files, classes, schemas, variables, or trace events with labels such as trauma test, mirror test, therapy engine, diagnosis, patient profile, psychological assessment, exposure therapy, or behavior score.

## Player Experience

### First Listening

For a new profile, the Threshold Chamber can draw the player through a short spoken rite. It should feel like entering the dream, not filling out a form.

Example prompts:

- "What kind of dark may enter tonight?"
- "Name something that should stay behind glass."
- "What shape leads you back?"
- "Speak a color for the room to remember."
- "What door should not open?"

The player can answer, stay silent, touch an object, or skip. Silence is meaningful but should not be punished.

The system converts responses into consent/session data:

- desired tone tags
- intensity ceiling
- hard boundary tags
- soft boundary tags
- return anchor
- grounding preference
- optional freeform symbol echoes, redacted before long-term storage

Raw speech should not be kept in long-term profile memory by default.

### Tonight Shape

Before later sessions, the game asks less. The room can invite the player to set the night's direction with a short ritual, object choice, or spoken phrase.

Examples:

- "Soft light."
- "Let it become strange."
- "Open the deep dark."
- "No teeth tonight."
- "Keep the lamp near."

The resulting covenant affects only the current session unless the player explicitly allows profile memory to keep the preference as an aggregate.

### Passages

Passages are adaptive dream fragments. They are not framed as challenges. They simply happen.

Examples:

- a door breathing warm air
- a mirror that shows the room from yesterday
- a candle refusing to die
- a floor becoming shallow water
- a small figure waiting at the edge of light
- a black star pulling sound from the room
- a garden where every flower has a keyhole

Passages should accept many player responses:

- approach
- withdraw
- speak
- wait
- alter an object
- protect something
- destroy something
- bargain
- return to an anchor
- refuse

The system records an `EchoTrace`, not a judgment.

## Core Data Shapes

### SessionCovenantV1

```json
{
  "schema": "SessionCovenantV1",
  "schemaVersion": 1,
  "mode": "tonight_shape",
  "toneTags": ["strange", "dark", "cathartic"],
  "intensityCeiling": 0.72,
  "hardBoundaryTags": ["real_world_self_harm"],
  "softBoundaryTags": ["body_horror", "helplessness"],
  "allowedPressureTags": ["grief", "shadow", "transformation"],
  "returnAnchor": {
    "kind": "image",
    "value": "light under a closed door"
  },
  "groundingPreference": "quiet_room",
  "memoryScope": "session_only"
}
```

### PassageV1

```json
{
  "schema": "PassageV1",
  "schemaVersion": 1,
  "id": "door_breathing_low",
  "motifs": ["door", "breath", "threshold"],
  "pressureTags": ["unknown", "invitation"],
  "formTags": ["locked_door", "warm_air", "soft_knocking"],
  "intensityBand": "strange",
  "allowedResponseKinds": ["approach", "speak", "wait", "withdraw", "alter_object"],
  "returnAnchorTags": ["lamp", "note", "threshold"],
  "variationFamily": "threshold_doors"
}
```

### EchoTraceV1

```json
{
  "schema": "EchoTraceV1",
  "schemaVersion": 1,
  "passageId": "door_breathing_low",
  "motifsTouched": ["door", "threshold"],
  "gestureTags": ["approached", "spoke_before_touching"],
  "tempo": "hesitant_then_committed",
  "pressureAccepted": 0.42,
  "returnAnchorUsed": false,
  "boundarySignals": ["long_pause"],
  "dreamflowDeltas": {
    "mirror_hall": 0.2,
    "cabin": 0.1,
    "space_black_hole": -0.05
  }
}
```

### EchoThreadV1

An `EchoThread` is a long-range symbolic recurrence. It tracks a pattern without exposing a conclusion.

```json
{
  "schema": "EchoThreadV1",
  "schemaVersion": 1,
  "threadId": "threshold_refusal_7b1a",
  "coreMotifs": ["door", "threshold", "voice"],
  "gestureTendencies": ["waits_before_entering", "speaks_to_closed_forms"],
  "returnSchedule": [1, 2, 3, 5, 8],
  "lastSurfaceForms": ["door", "window"],
  "nextDisguiseHints": ["book", "well", "mouth"],
  "weight": 0.63
}
```

## Never-The-Same-Twice Architecture

The Variation Lattice should combine deterministic reproducibility with deep novelty.

Inputs:

- profile root seed
- save slot id
- incarnation index
- current session seed
- SessionCovenant
- DreamerProfile aggregates
- recent EchoTraces
- Architect dream weights
- optional GNI directive

Rules:

- Suppress exact Passage repeats within a recent window.
- Suppress repeated surface forms even when the underlying motif returns.
- Prefer motif transformation chains: door -> window -> book -> cave -> mouth -> eyelid.
- Use Fibonacci-like recurrence intervals for EchoThreads: 1, 2, 3, 5, 8, 13 sessions or passage beats.
- Use golden-ratio offsets when picking alternate forms so recurrence feels organic instead of evenly spaced.
- Let intensity rise only within the current SessionCovenant ceiling.
- Respect hard boundary tags as exclusion filters.
- Treat soft boundary tags as pressure reducers unless the player later invites them.
- Keep a return anchor available when intensity crosses a threshold.

This creates recurrence without repetition: the same deep shape can return as different objects, locations, masks, sounds, or choices.

## GNI Boundary

GNI should receive a redacted `PassageContext` as part of the existing `SessionBundleV1` flow.

Send:

- covenant tone tags
- intensity ceiling
- allowed pressure tags
- redacted boundary tags
- recent motifs
- recent gesture tags
- EchoThread summaries
- DreamerMemoryContext

Do not send by default:

- raw speech transcript
- raw trauma disclosures
- private notes
- direct diagnostic labels
- unrestricted memory writes

GNI may return:

- motif pressure suggestions
- dream weight deltas
- mask pressure
- pacing deltas
- symbolic echoes
- suggested intensity direction inside the covenant ceiling

GNI may not return:

- runtime code
- diagnoses
- medical/therapeutic claims
- commands to violate hard boundaries
- direct player-facing explanations of hidden logic

## Persistence

Session data:

- current SessionCovenant
- active Passage ids
- recent EchoTraces
- ReturnAnchor

Profile data:

- aggregated motif counts
- aggregated gesture tendencies
- EchoThread summaries
- intensity preference history as aggregates
- boundary tags only if the player consents to profile memory

Avoid long-term raw text unless a future explicit player-facing journal/export feature asks for it and privacy review approves it.

## Safety And Intensity

Horror is allowed. Unbounded horror is not.

Intensity bands:

- `gentle`
- `strange`
- `dark`
- `horrific`
- `abyssal`

Rules:

- First session starts below the player's chosen ceiling.
- `horrific` and `abyssal` require clear opt-in or repeated player invitation.
- The return anchor should become easier to access as intensity rises.
- Boundary signals such as repeated pause, backtracking, abrupt exit, or explicit refusal should lower pressure.
- Explicit phrases like "stop", "not this", "go back", or "light" should route to a grounding/return flow.
- Crisis or self-harm language should leave the in-world voice and surface external support resources in the surrounding app/account layer.

## UE5 VR And Console Notes

- Passages should become DataAssets with motif, pressure, form, intensity, and boundary tags.
- Passage selection should use `FRandomStream` or an injected deterministic random service.
- EchoTrace capture should be event-driven, not actor-tick polling.
- VR comfort should treat intensity as visual/audio/haptic budgets, not only narrative content.
- Console builds must support controller-only symbolic input; speech should be optional.
- ReturnAnchor should map to a reliable input action and diegetic object.
- Horror effects must avoid sudden unavoidable discomfort spikes in VR unless explicitly opted into.

## Testing

Add tests for:

- SessionCovenant validation.
- hard boundary exclusion.
- soft boundary pressure reduction.
- exact Passage repeat suppression.
- surface form repeat suppression.
- Fibonacci recurrence scheduling.
- deterministic replay with the same seed.
- divergent sessions with different save slots/incarnation indices.
- GNI directives clamped inside the covenant.
- crisis phrase routing to a support boundary without in-world diagnosis.

## Out Of Scope For First Implementation

- full clinical tooling
- medical claims
- cloud profile sync
- multiplayer/shared dreams
- voice transcription storage
- final UE5 rendering
- full horror content library

## First Implementation Slice

1. Add `SessionCovenantV1` model, schema, validator, and fixture.
2. Add `PassageV1` catalog with a few gentle/strange/dark Passages.
3. Add `VariationLattice` selection with seed, recency suppression, boundary filtering, and Fibonacci recurrence helpers.
4. Add `EchoTraceV1` capture from simulated player responses.
5. Attach redacted covenant/passage context to the GNI processing request.
6. Save/load current covenant and recent EchoTraces.
7. Add tests and scenario baselines.

This keeps the next build small but points the architecture toward the full dream engine.
