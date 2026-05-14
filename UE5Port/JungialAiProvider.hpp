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

struct FGniProviderJobV1
{
    String Id;
    String StatusUrl;
    int32 PollAfterMs = 0;
};

struct FGniBridgeResultV1
{
    String Status; // pending, directive_ready, invalid_session, provider_empty, provider_error
    String Source; // none, provided, provider, emulator
    FGniProcessingRequestV1 Request;
    FJungialDirectiveV1 Directive;
    FGniProviderJobV1 ProviderJob;
    Array<String> Errors;
};

struct FGniDirectiveQueueEntryV1
{
    String Id;
    String Status; // pending or resolved
    String Reason;
    int32 Attempts = 0;
    String CreatedAt;
    String UpdatedAt;
    String ResolvedAt;
    FGniProviderJobV1 ProviderJob;
    FGniProcessingRequestV1 Request;
    FJungialDirectiveV1 Directive;
};

struct FGniProviderJobStatusV1
{
    String Status; // pending, queued, processing, ready, failed
    FGniProviderJobV1 ProviderJob;
    FJungialDirectiveV1 Directive;
    Array<String> Errors;
};

struct FGniDirectiveQueueV1
{
    Array<FGniDirectiveQueueEntryV1> Pending;
    Array<FGniDirectiveQueueEntryV1> Resolved;
};

class IJungialAiProvider
{
public:
    virtual ~IJungialAiProvider() = default;

    // Game systems pass a compact request to the provider.
    // The provider returns constrained data, never executable behavior.
    virtual FJungialDirectiveV1 ProcessRequest(const FGniProcessingRequestV1& Request) = 0;

    // Async providers can accept work, save ProviderJob, and resolve later.
    virtual FGniProviderJobStatusV1 PollProviderJob(const FGniProviderJobV1& ProviderJob) = 0;
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

class UGniDirectiveQueueSubsystem
{
public:
    FGniDirectiveQueueV1 Snapshot;

    void EnqueuePending(const FGniProcessingRequestV1& Request, const String& Reason, const FGniProviderJobV1& ProviderJob)
    {
        // Persist in SaveGame state and retry from a platform-safe async task.
        // Duplicate session IDs should update Attempts rather than appending.
        // HTTP 202 job metadata should be stored as ProviderJob for later polling.
    }

    bool ResolvePending(const String& Id, const FJungialDirectiveV1& Directive)
    {
        // Normalize Directive before moving the entry from Pending to Resolved.
        // Return false when the response no longer matches a pending request.
        return false;
    }
};

class UGniQueueProcessorSubsystem
{
public:
    bool ProcessPendingQueue(UGniDirectiveQueueSubsystem& Queue, UJungialArchitectSubsystem& Architect)
    {
        // Prefer PollProviderJob() when a queue entry has ProviderJob.StatusUrl.
        // Fall back to ProcessRequest() only when no provider job exists.
        // Run outside render-critical flow; never poll from actor Tick in VR.
        // Apply only normalized JungialDirectiveV1 data to Architect, then save Snapshot.
        // Append a developer trace entry named "gni.queue.processed" with status counts.
        return false;
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

    FGniProviderJobStatusV1 PollProviderJob(const FGniProviderJobV1& ProviderJob) override
    {
        // GET ProviderJob.StatusUrl using the same auth headers as ProcessRequest.
        // Treat 202 or 204 as still pending.
        // Treat ready/completed responses as a JungialDirectiveV1 candidate.
        return FGniProviderJobStatusV1();
    }
};
