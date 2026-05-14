// PSEUDOCODE ONLY: this is the future GNI plug-in seam.

#pragma once

#include "JungialTypes.hpp"

struct FJungialDirectiveV1
{
    Map<String, float> DreamWeightDeltas;
    Array<String> SymbolEchoes;
    Map<String, float> MaskPressure;
    Map<String, float> PacingDelta;
};

class IJungialAiProvider
{
public:
    virtual ~IJungialAiProvider() = default;

    // Game systems pass a compact bundle to the provider.
    // The provider returns constrained data, never executable behavior.
    virtual FJungialDirectiveV1 ProcessSessionBundle(const FSessionBundleV1& Bundle) = 0;
};

class FGniProviderAdapter final : public IJungialAiProvider
{
public:
    String Endpoint = "gni://local-dev-placeholder";

    FJungialDirectiveV1 ProcessSessionBundle(const FSessionBundleV1& Bundle) override
    {
        // Serialize Bundle as SessionBundleV1 JSON.
        // Send to GNI when available.
        // Validate response against JungialDirectiveV1.
        // Return empty directive while GNI is still under development.
        return FJungialDirectiveV1();
    }
};
