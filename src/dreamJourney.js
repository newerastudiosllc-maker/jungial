const JOURNEY_ROLES = Object.freeze(['entry', 'pressure', 'mirror', 'return']);

export function selectDreamJourney({ dreamflow, archetypeState, feelingState, roomConfig }) {
  const beats = JOURNEY_ROLES.map((role) => {
    const module = dreamflow.selectNext({ archetypeState, feelingState, roomConfig });
    return {
      role,
      moduleId: module.id,
      moduleName: module.name,
      symbolicTags: [...module.symbolicTags],
      weightBreakdown: module.weightBreakdown
    };
  });
  const symbolTrail = [...new Set(beats.flatMap((beat) => beat.symbolicTags))];

  return {
    schema: 'DreamJourneyV1',
    beats,
    symbolTrail,
    summary: beats.map((beat) => `${beat.role}:${beat.moduleName}`).join(' -> ')
  };
}
