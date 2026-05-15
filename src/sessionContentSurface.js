import { createSessionContentGateReport } from './sessionContentGate.js';
import { createSessionContentReplacementPlan } from './sessionContentReplacement.js';

export function resolveSessionContentSurface({
  sessionCovenant = null,
  sessionShapeSelection = null,
  candidatePassage = null,
  candidateDreamWeather = null,
  dreamJourney = null,
  mask = null,
  passages = [],
  recentEchoTraces = [],
  dreamerMemoryContext = null,
  architectState = null,
  seed = 0
} = {}) {
  const contentGate = createSessionContentGateReport({
    sessionCovenant,
    sessionShapeSelection,
    passage: candidatePassage,
    dreamWeather: candidateDreamWeather,
    dreamJourney,
    mask
  });
  const contentReplacementPlan = createSessionContentReplacementPlan({
    gateReport: contentGate,
    sessionCovenant,
    sessionShapeSelection,
    passages,
    recentEchoTraces,
    dreamerMemoryContext,
    architectState,
    seed
  });

  return {
    passage: contentReplacementPlan.replacement.passage ?? candidatePassage,
    dreamWeather: contentReplacementPlan.replacement.dreamWeather ?? candidateDreamWeather,
    contentGate,
    contentReplacementPlan
  };
}
