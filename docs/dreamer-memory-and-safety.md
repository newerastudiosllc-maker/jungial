# Dreamer Memory And Safety Notes

## North Star

Jungial should feel like a living dream that remembers, mirrors, and changes. The player should experience consequence and recurrence, not exposed machinery.

The operating rule is:

**Mystery in the world. Transparency at the boundary.**

Inside the experience, Jungial does not show archetype scores, dream weights, model status, or therapeutic explanations. Outside the experience, the player must have clear profile controls, save controls, privacy controls, and reset/delete paths.

## Hidden Memory Model

`DreamerProfileV1` is a redacted long-term memory layer. It stores symbolic aggregates, not raw confession:

- recurring symbols
- recurring archetypes
- familiar masks
- familiar dream modules
- familiar actions
- vibe echoes
- session count
- last session digest

It intentionally avoids raw speech, raw room text, transcripts, and arbitrary notes. The memory context sent toward GNI is `DreamerMemoryContextV1`, a smaller redacted view of that profile.

`FirstListeningRunV1` can feed this memory layer, but only as aggregate symbolic residue. It keeps symbolic object ids, motifs, gesture tags, pressure acceptance, boundary signals, tone tags, and a return anchor hint. It must not retain the player's raw spoken words or present itself as intake, diagnosis, or assessment.

`ExperienceDirectiveV1` can use the memory context to bias pacing, dream modules, masks, and return readiness, but it should store only bounded reason codes and aggregate hints. It should never store why in plain language, quote the player, or make clinical claims.

`SessionFrameV1` is the renderer handoff that combines presentation state and hidden direction. It should never contain raw speech, private memory, diagnostic explanation, or player-facing rationale; it exists so lights, audio, haptics, movement, and VR comfort can react without learning the hidden machinery.

`SessionShapeSelectionV1` lets the player or platform choose broad tone without exposing hidden scoring. A shape may make the session gentle, strange, dark, or horrific, but it resolves to bounded covenant fields and can only lower intensity or add boundaries through overrides.

`SessionContentGateV1` is the hidden audit after content selection. It checks Passage, Dream Weather, DreamJourney, and Mask packets against the current covenant, records suppressed tags and replacement hints, and stays internal. It should never become player-facing explanation, diagnostic language, or a storehouse for raw speech.

`SessionContentReplacementPlanV1` is the hidden follow-up route. It can carry a safer Passage and Dream Weather packet when the gate blocks content, but it should still feel like dream continuity to the player rather than a rule correction.

## Save Modes

Use these modes as the product language and system shape:

- `fresh`: new profile and root seed, no inherited symbolic memory.
- `new_incarnation`: new save/world with optional faint echoes if cross-save echoes are enabled.
- `continue`: load the existing save and keep evolving the same symbolic memory.

Every save slot should derive procedural seeds from profile root seed, slot id, mode, and incarnation index so two saves do not collapse into the same dream path.

`SaveSlotPlanV1` is the runtime contract for this. It stores the slot id, mode, incarnation index, effective run seed, active redacted profile, and the redacted GNI memory context. In `new_incarnation`, the active profile begins empty; cross-save echoes come only from `DreamerMemoryContextV1` when consent allows them.

## Consent Controls

Minimum controls to keep before production:

- Enable/disable profile memory.
- Enable/disable cross-save echoes.
- Reset the current save's memory.
- Delete the whole Dreamer profile.
- Export profile/save data for debugging or portability.
- Keep local-only mode possible until cloud policy is explicit.

The game can stay poetic. The account/settings layer cannot be vague about what is retained.

## GNI Boundaries

GNI receives structured context, not mutable gameplay state. It returns constrained directives, not executable behavior.

Allowed direction:

- adjust dream weights
- echo symbols
- nudge mask pressure
- nudge pacing

Disallowed direction:

- runtime code execution
- direct player diagnosis
- direct mental health claims
- direct revelation of hidden scoring
- unbounded memory writes

## In-World Voice

Avoid lines that expose mechanism:

- "Your Shadow score increased."
- "The AI noticed you avoid mirrors."
- "This dream means you fear intimacy."
- "Therapeutic protocol activated."

Prefer diegetic consequence:

- The mirror is warmer than before.
- The same door returns, but lower.
- A mask waits where no one stood.
- The room has kept the shape of a choice.

## Safety Rails

Jungial can be therapeutic in effect without claiming to diagnose or treat. Until there is clinical validation and legal review, public language should stay in the territory of reflection, dreamwork, symbolic exploration, emotional insight, and personal mythology.

Production safety should include:

- Crisis/self-harm escalation boundaries.
- Content intensity controls.
- A grounded exit/return path from intense sessions.
- Session length awareness and gentle stopping points.
- Clear separation between world voice and support resources.
- Hidden content-gate checks before save, renderer handoff, or future replacement routing.
- Replacement routes should swap content silently and preserve mystery; blocked reasons stay internal.
- Human review before any medical, therapeutic, or clinical claim.

## Team Checklist

Before adding any new memory field, ask:

- Does the world need this, or are we collecting because we can?
- Can this be stored as an aggregate instead of raw text?
- Can the player delete or reset it?
- Can GNI use it without learning private details verbatim?
- Would this field be safe to show in an export?
- Does this make two saves more personal without making them predictable?

Before adding any in-world explanation, ask:

- Does this break the dream?
- Does this reveal scoring or model logic?
- Can the same idea be expressed as atmosphere, symbol, recurrence, or object behavior?
