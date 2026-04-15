using Casette.Api.Infrastructure.Services;
using System.Text.Json.Serialization;

namespace Casette.Api.Infrastructure.Responses.Tmdb;

public sealed class TmdbSearchMovieResponse
{
    [JsonPropertyName("page")]
    public required int Page { get; init; }

    [JsonPropertyName("results")]
    public required IReadOnlyList<TmdbSearchMovieResultResponse> Results { get; init; }

    [JsonPropertyName("total_pages")]
    public required int TotalPages { get; init; }

    [JsonPropertyName("total_results")]
    public required int TotalResults { get; init; }
}
