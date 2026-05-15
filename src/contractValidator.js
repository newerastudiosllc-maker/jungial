import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import {
  validateDirective,
  validateDreamerMemoryContext,
  validateDreamerProfile,
  validateDreamWeather,
  validateEchoTrace,
  validateFixtureManifest,
  validateGniFirebreakTrace,
  validateGniBridgeResult,
  validateGniContractCheckReport,
  validateGniDirectiveQueue,
  validateGniQueueProcessResult,
  validateGniProcessingRequest,
  validatePassage,
  validateSaveGame,
  validateSessionCovenant,
  validateSessionBundle,
  validateThresholdPresentation,
  validateTrace,
  validateTraceSummary,
  validateWeatherTrace
} from './contracts.js';

export function validateContractDocument(document) {
  switch (document?.schema) {
    case 'SessionBundleV1':
      return validateSessionBundle(document);
    case 'GniProcessingRequestV1':
      return validateGniProcessingRequest(document);
    case 'JungialDirectiveV1':
      return validateDirective(document);
    case 'DreamerProfileV1':
      return validateDreamerProfile(document);
    case 'DreamerMemoryContextV1':
      return validateDreamerMemoryContext(document);
    case 'DreamWeatherV1':
      return validateDreamWeather(document);
    case 'WeatherTraceV1':
      return validateWeatherTrace(document);
    case 'SessionCovenantV1':
      return validateSessionCovenant(document);
    case 'PassageV1':
      return validatePassage(document);
    case 'EchoTraceV1':
      return validateEchoTrace(document);
    case 'ThresholdPresentationV1':
      return validateThresholdPresentation(document);
    case 'GniBridgeResultV1':
      return validateGniBridgeResult(document);
    case 'GniFirebreakTraceV1':
      return validateGniFirebreakTrace(document);
    case 'GniContractCheckReportV1':
      return validateGniContractCheckReport(document);
    case 'GniDirectiveQueueV1':
      return validateGniDirectiveQueue(document);
    case 'GniDirectiveQueueProcessResultV1':
      return validateGniQueueProcessResult(document);
    case 'JungialTraceV1':
      return validateTrace(document);
    case 'JungialTraceSummaryV1':
      return validateTraceSummary(document);
    case 'JungialContractFixtureManifestV1':
      return validateFixtureManifest(document);
    case 'JungialSaveGame':
      return validateSaveGame(document);
    default:
      return {
        valid: false,
        errors: [`unsupported contract schema: ${document?.schema ?? 'missing'}`]
      };
  }
}

export async function validateContractFiles(paths) {
  const files = [];
  for (const path of paths) {
    const document = JSON.parse(await readFile(path, 'utf8'));
    const validation = validateContractDocument(document);
    files.push({
      path,
      schema: document?.schema ?? null,
      valid: validation.valid,
      errors: validation.errors
    });
  }

  return {
    schema: 'JungialContractValidationReportV1',
    ok: files.every((file) => file.valid),
    files
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error('Usage: node src/contractValidator.js <contract.json> [...]');
    process.exit(1);
  }

  const report = await validateContractFiles(paths);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    process.exit(1);
  }
}
