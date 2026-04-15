using Casette.Api.Infrastructure.Services;
using System.Text.Json.Serialization;

namespace Casette.Api.Infrastructure.Responses.Tmdb;

public sealed class TmdbSearchTvResponse
{
    [JsonPropertyName("page")]
    public required int Page { get; init; }

    [JsonPropertyName("results")]
    public required IReadOnlyList<TmdbSearchTvResultResponse> Results { get; init; }

    [JsonPropertyName("total_pages")]
    public required int TotalPages { get; init; }

    [JsonPropertyName("total_results")]
    public required int TotalResults { get; init; }
}
