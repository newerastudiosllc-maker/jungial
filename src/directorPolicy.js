export function createDreamWeightOverrides(architectState) {
  const weights = architectState?.globalDreamWeights ?? {};
  return Object.fromEntries(
    Object.entries(weights).map(([moduleId, value]) => [
      moduleId,
      clampMultiplier(value)
    ])
  );
}

function clampMultiplier(value) {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Number(Math.max(0.05, Math.min(4, value)).toFixed(3));
}
