using System.Text.Json.Serialization;

namespace Casette.Api.Infrastructure.Requests;

public sealed class TmdbSearchRequest
{
    [JsonPropertyName("query")]
    public required string Query { get; init; }

    [JsonPropertyName("page")]
    public required int Page { get; init; }
}
