# Jungial Phase 2 Team Brief

## Mission

Build Jungial into an immersive dreamwork experience where the world observes, mirrors, and remembers without explaining itself. The player should feel surprised by recurrence and consequence, while the system remains safe, inspectable, and respectful outside the dream.

## Immediate Objective

Phase 2 is the Living Session Spine:

1. First Listening Sequence
2. Long dream session
3. Return and journal
4. Redacted GNI handoff
5. Memory update
6. Save, resume, and new incarnation support
7. UE5 vertical slice proof

## Current Prototype Assets

The repo already contains engine-agnostic Node.js systems, JSON contracts, and UE5 pseudocode for:

- Threshold Chamber
- Feeling Engine
- Archetype Resonance
- Dreamflow
- Passage Lattice
- Dream Weather
- Session Arc
- Session Shape presets
- Session Content Gate
- Session Content Replacement routing
- Dream Session checkpoints
- Dreamer Profile memory
- GNI bridge, queue, emulator, and Firebreak
- Runtime readiness preflight
- Developer trace output
- Scenario and contract validation

This gives the team a stable architecture to port and expand rather than a blank page.

## Core Roles

### Creative Director / Product Vision

Owner: Jesse / New Era Studios LLC

Responsibilities:

- Protect the tone and intent.
- Decide what the player should feel.
- Approve symbols, masks, core rituals, and public positioning.
- Keep the experience strange, quiet, and emotionally powerful.

### Technical Director

Responsibilities:

- Own UE5 architecture.
- Map Node contracts to UE subsystems, components, DataAssets, and SaveGame objects.
- Keep VR/console constraints in scope.
- Make sure async GNI work cannot hitch or block gameplay.

### AI / GNI Integration Engineer

Responsibilities:

- Own GNI provider integration.
- Maintain `SessionBundleV1`, `GniProcessingRequestV1`, and `JungialDirectiveV1`.
- Preserve `DreamJourneyContextV1` as compact symbolic reroute evidence, not player-facing explanation.
- Compare real GNI behavior against the deterministic emulator's reroute response before accepting provider changes.
- Keep Firebreak and queue behavior safe.
- Build provider monitoring, retries, and contract tests.

### Gameplay Systems Designer

Responsibilities:

- Design First Listening beats, session pacing, return anchors, and long-session rules.
- Tune Session Arc and Experience Director behavior.
- Ensure the player can keep going or return without feeling trapped.

### Narrative / Symbolic Content Designer

Responsibilities:

- Expand passages, masks, symbols, dream modules, and journal voice.
- Keep content non-expository and dream-native.
- Work with safety advisor on intense, strange, and horrific content.

### Technical Artist / Atmosphere Designer

Responsibilities:

- Translate presentation packets into lights, fog, bloom, materials, post-process, haptics, and movement feel.
- Prototype Heartlight, portal, mirror, lamp, fog emergence, and chamber transformations.

### Audio Designer

Responsibilities:

- Create silence, room tone, heartlight bloom, portal pressure, mask emergence, and reactive ambience.
- Build parameter-driven audio tied to Feeling and Dream Weather.

### UX / Player Trust Designer

Responsibilities:

- Design save slots, fresh/continue/new incarnation flow, memory settings, export/delete/reset, and session intensity controls.
- Keep trust surfaces clear while preserving dream mystery in-world.

### Privacy / Security Engineer

Responsibilities:

- Review data storage, export/delete, local-only options, GNI request payloads, and sensitive-field suppression.
- Prepare for encryption, cloud sync policy, and platform privacy review.

### Clinical / Trauma-Informed Advisor

Responsibilities:

- Review intensity controls, crisis boundaries, grounding, exit flow, trauma-sensitive content, and public language.
- Help prevent accidental therapeutic claims or unsafe interaction patterns.

### QA / Automation Lead

Responsibilities:

- Own replay scripts, scenario baselines, fixture validation, save migration tests, and long-session regression cases.
- Build UE5 smoke tests when the vertical slice exists.

### Producer

Responsibilities:

- Convert the roadmap into milestones.
- Track ownership, risks, review gates, and decisions.
- Protect scope.

## First Hiring / Collaboration Priority

For the next 30 to 45 days, prioritize:

1. Technical Director with UE5 systems experience.
2. AI/GNI Integration Engineer.
3. Narrative/Symbolic Content Designer.
4. Trauma-informed advisor on a review basis.
5. Technical Artist for chamber atmosphere prototypes.

## Working Agreements

- The world never explains the hidden system.
- The settings and privacy layer never hides what is stored.
- Raw speech is not persisted.
- GNI never owns mutable gameplay state.
- AI output is advisory and must pass through Firebreak.
- Session shape choices must resolve into bounded covenants before gameplay, renderer, or GNI systems consume them.
- Dream module selection must respect covenant hard boundaries before final content-gate audit.
- Selected dream content must pass the hidden content surface resolver before save, renderer handoff, or GNI context.
- Replacement routing must stay internal and make safer content feel emergent, not corrected.
- Content must pass validation before entering the runtime catalog.
- Runtime readiness must block broken content and degrade optional provider gaps before a session starts.
- Procedural changes must pass replay/scenario checks.
- Safety review happens before public claims or broader playtests.

## Recruiting Pitch

Jungial is an immersive symbolic dreamscape project at the intersection of games, AI, personal mythology, and reflective experience design. The current prototype already has deterministic runtime contracts, save/resume, redacted memory, async AI handoff, and UE5-oriented architecture notes. We are now building the first playable Living Session Spine: a quiet chamber, subtle listening, emergent dream sessions, safe memory, and a world that seems to remember without explaining itself.

## What To Show A Candidate

- `README.md`
- `docs/dreamer-memory-and-safety.md`
- `docs/ue5-vr-console-readiness.md`
- `docs/superpowers/specs/2026-05-15-phase-2-living-session-spine-design.md`
- `npm run dream:checkpoint -- --emulate-gni --trace=saves/dream-session-trace.json`
- `npm run trace -- saves/dream-session-trace.json`
