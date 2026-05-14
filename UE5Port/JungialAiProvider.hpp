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

struct FGniProcessingRequestV1
{
    String Provider = "GNI";
    String Endpoint;
    String Model;
    String InputFormat = "SessionBundleV1";
    String OutputFormat = "JungialDirectiveV1";
    FSessionBundleV1 Payload;
};

struct FGniBridgeResultV1
{
    String Status; // pending, directive_ready, invalid_session, provider_empty, provider_error
    String Source; // none, provided, provider, emulator
    FGniProcessingRequestV1 Request;
    FJungialDirectiveV1 Directive;
    Array<String> Errors;
};

class IJungialAiProvider
{
public:
    virtual ~IJungialAiProvider() = default;

    // Game systems pass a compact request to the provider.
    // The provider returns constrained data, never executable behavior.
    virtual FJungialDirectiveV1 ProcessRequest(const FGniProcessingRequestV1& Request) = 0;
};

class UGniBridgeSubsystem
{
public:
    IJungialAiProvider* Provider = nullptr;

    FGniBridgeResultV1 ProcessSessionBundle(const FSessionBundleV1& Bundle)
    {
        // Validate Bundle as SessionBundleV1.
        // Create GniProcessingRequestV1.
        // Route to Provider, fixture, or emulator.
        // Normalize provider output as JungialDirectiveV1 before gameplay sees it.
        return FGniBridgeResultV1();
    }
};

class FGniProviderAdapter final : public IJungialAiProvider
{
public:
    String Endpoint = "gni://local-dev-placeholder";

    FJungialDirectiveV1 ProcessRequest(const FGniProcessingRequestV1& Request) override
    {
        // Serialize Request as GniProcessingRequestV1 JSON.
        // Send to GNI when available.
        // Validate response against JungialDirectiveV1.
        // Return empty directive while GNI is still under development.
        return FJungialDirectiveV1();
    }
};
