import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DREAD_BUDGET_AXES, createDreamWeather, createWeatherTrace, normalizeDreadBudget, toGniWeatherContext } from "../src/dreamWeather.js";
import { createSessionCovenant } from "../src/sessionCovenant.js";

describe("dream weather", () => {
  it("creates default DreamWeatherV1 with gentle stillness and low pressure", () => {
    const weather = createDreamWeather({ seed: 11 });

    assert.equal(weather.schema, "DreamWeatherV1");
    assert.equal(weather.schemaVersion, 1);
    assert.equal(weather.weatherId, "weather-11");
    assert.equal(weather.mood, "stillness");
    assert.equal(weather.pressure, "low");
    assert.equal(weather.ceiling, 0.35);
    assert.ok(weather.weatherTags.includes("silence"));
    assert.ok(weather.weatherTags.includes("threshold"));

    for (const axis of DREAD_BUDGET_AXES) {
      assert.ok(weather.dreadBudget[axis] >= 0, `${axis} should be at least 0`);
      assert.ok(weather.dreadBudget[axis] <= 0.35, `${axis} should stay within the gentle ceiling`);
    }
  });

  it("clamps every dread axis to the covenant ceiling when intensity band is gentle", () => {
    const covenant = {
      intensityBand: "gentle"
    };
    const weather = createDreamWeather({
      seed: 17,
      covenant,
      dreadBudget: Object.fromEntries(DREAD_BUDGET_AXES.map((axis) => [axis, 1]))
    });

    for (const axis of DREAD_BUDGET_AXES) {
      assert.equal(weather.dreadBudget[axis], 0.35);
    }
    assert.equal(weather.ceiling, 0.35);
  });

  it("suppresses pursuit tag and dread axis when pursuit is a hard boundary", () => {
    const covenant = createSessionCovenant({
      hardBoundaryTags: ["pursuit"]
    });
    const weather = createDreamWeather({
      seed: 23,
      covenant,
      weatherTags: ["silence", "pursuit"],
      dreadBudget: { pursuit: 0.25, watching: 0.2 }
    });

    assert.equal(weather.weatherTags.includes("pursuit"), false);
    assert.equal(weather.dreadBudget.pursuit, 0);
    assert.ok(weather.suppressedTags.includes("pursuit"));
  });

  it("does not return default weather tags that cross hard boundaries", () => {
    const weather = createDreamWeather({
      seed: 24,
      covenant: createSessionCovenant({
        hardBoundaryTags: ["silence"]
      })
    });
    const context = toGniWeatherContext({ dreamWeather: weather });

    assert.equal(weather.weatherTags.includes("silence"), false);
    assert.ok(weather.suppressedTags.includes("silence"));
    assert.equal(context.weatherTags.includes("silence"), false);
    assert.ok(context.suppressedTags.includes("silence"));
  });

  it("preserves canonical camelCase dread axes for hard boundaries", () => {
    const weather = createDreamWeather({
      seed: "My Secret Name!",
      covenant: {
        hardBoundaries: ["cosmicDread"]
      },
      dreadBudget: {
        cosmicDread: 0.3,
        bodyUnease: 0.2
      }
    });
    const trace = createWeatherTrace({ weather, seed: "My Secret Name!" });

    assert.equal(weather.dreadBudget.cosmicDread, 0);
    assert.ok(weather.suppressedTags.includes("cosmicDread"));
    assert.equal(weather.suppressedTags.includes("cosmicdread"), false);
    assert.equal(weather.suppressedTags.includes("cosmic_dread"), false);
    assert.equal(weather.suppressedTags.includes("bodyunease"), false);
    assert.equal(weather.suppressedTags.includes("body_unease"), false);
    assert.equal(weather.weatherId.includes("My Secret Name!"), false);
    assert.equal(weather.weatherId.includes("my_secret_name"), false);
    assert.equal(trace.traceId.includes("My Secret Name!"), false);
    assert.equal(trace.traceId.includes("my_secret_name"), false);
  });

  it("is deterministic from the same input and seed", () => {
    const input = {
      seed: "same-night",
      covenant: { intensity: { band: "curious" } },
      weatherTags: ["mist", "mirror", "mist"],
      dreadBudget: { cosmicDread: 0.4, watching: 0.3 }
    };

    assert.deepEqual(createDreamWeather(input), createDreamWeather(input));
  });

  it("derives deterministic safe ids for private string seeds", () => {
    const first = createDreamWeather({ seed: "my exact street address" });
    const second = createDreamWeather({ seed: "my exact street address" });
    const trace = createWeatherTrace({ weather: first, seed: "my exact street address" });

    assert.equal(first.weatherId, second.weatherId);
    assert.equal(first.weatherId.includes("my exact street address"), false);
    assert.equal(trace.traceId.includes("my exact street address"), false);
    assert.match(first.weatherId, /^weather-[a-z0-9]+$/);
    assert.match(trace.traceId, /^weather-trace-[a-z0-9]+$/);
  });

  it("uses SessionCovenantV1 intensityCeiling before intensity band fallback", () => {
    const covenant = createSessionCovenant({ intensityCeiling: 0.6 });

    const weather = createDreamWeather({ seed: 42, covenant });

    assert.equal(weather.ceiling, 0.6);
  });

  it("allowlists returned weather, trace, and GNI context tags", () => {
    const weather = createDreamWeather({
      seed: 43,
      weatherTags: ["mist", "my exact street address", "rebirth"],
      suppressedTags: ["pursuit", "my secret name"]
    });
    const trace = createWeatherTrace({
      weather,
      sourceTags: ["door", "my exact street address"],
      suppressedTags: ["watching", "my secret name"],
      seed: 610
    });
    const context = toGniWeatherContext({ dreamWeather: weather, weatherTrace: trace });

    assert.deepEqual(weather.weatherTags, ["silence", "threshold", "mist", "rebirth"]);
    assert.deepEqual(weather.suppressedTags, ["pursuit"]);
    assert.equal(trace.traceId, "weather-trace-610");
    assert.deepEqual(trace.sourceTags, ["door"]);
    assert.deepEqual(trace.resultingTags, ["silence", "threshold", "mist", "rebirth"]);
    assert.deepEqual(trace.suppressedTags, ["pursuit", "watching"]);
    assert.deepEqual(context.weatherTags, ["silence", "threshold", "mist", "rebirth"]);
    assert.deepEqual(context.suppressedTags, ["pursuit", "watching"]);
  });

  it("creates a WeatherTraceV1 with exact trace shape and strongest dread axis", () => {
    const weather = createDreamWeather({
      seed: 41,
      weatherTags: ["mist", "mirror"],
      dreadBudget: {
        pursuit: 0.1,
        cosmicDread: 0.34,
        watching: 0.2
      }
    });

    const trace = createWeatherTrace({
      weather,
      sourceTags: ["mirror", "mist"],
      suppressedTags: ["pursuit"],
      seed: 41
    });

    assert.deepEqual(Object.keys(trace), [
      "schema",
      "schemaVersion",
      "traceId",
      "weatherId",
      "mood",
      "pressure",
      "sourceTags",
      "resultingTags",
      "suppressedTags",
      "strongestDreadAxis"
    ]);
    assert.equal(trace.schema, "WeatherTraceV1");
    assert.equal(trace.schemaVersion, 1);
    assert.equal(trace.traceId, "weather-trace-41");
    assert.equal(trace.weatherId, weather.weatherId);
    assert.equal(trace.mood, weather.mood);
    assert.equal(trace.pressure, weather.pressure);
    assert.deepEqual(trace.sourceTags, ["mirror", "mist"]);
    assert.deepEqual(trace.resultingTags, weather.weatherTags);
    assert.deepEqual(trace.suppressedTags, ["pursuit"]);
    assert.equal(trace.strongestDreadAxis, "cosmicDread");
  });

  it("redacts raw and private input from GNI weather context", () => {
    const dreamWeather = createDreamWeather({
      seed: 31,
      rawText: "I saw my exact street address",
      private: { name: "not for model" },
      weatherTags: ["silence", "threshold"]
    });
    const weatherTrace = createWeatherTrace({
      weather: dreamWeather,
      sourceTags: ["raw_private_symbol"],
      suppressedTags: ["pursuit"],
      seed: 31
    });

    const context = toGniWeatherContext({ dreamWeather, weatherTrace });

    assert.deepEqual(Object.keys(context).sort(), [
      "dreadBudget",
      "pressure",
      "schema",
      "schemaVersion",
      "suppressedTags",
      "weatherTags"
    ]);
    assert.equal(context.schema, "DreamWeatherContextV1");
    assert.equal(context.schemaVersion, 1);
    assert.deepEqual(context.weatherTags, dreamWeather.weatherTags);
    assert.equal(context.pressure, dreamWeather.pressure);
    assert.deepEqual(context.dreadBudget, dreamWeather.dreadBudget);
    assert.deepEqual(context.suppressedTags, ["pursuit"]);
    assert.equal(JSON.stringify(context).includes("exact street address"), false);
    assert.equal(JSON.stringify(context).includes("not for model"), false);
    assert.equal(Object.hasOwn(context, "weatherTrace"), false);
  });

  it("normalizes missing dread budget axes as zero and clamps to the ceiling", () => {
    assert.deepEqual(normalizeDreadBudget({ pursuit: 0.9, loss: -1 }, 0.35), {
      pursuit: 0.35,
      bodyUnease: 0,
      cosmicDread: 0,
      disorientation: 0,
      loss: 0,
      watching: 0,
      claustrophobia: 0
    });
  });
});
