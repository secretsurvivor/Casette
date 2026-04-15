using System.Text.Json.Serialization;

namespace Casette.Api.Infrastructure.Responses.Tmdb;

public sealed class TmdbSearchTvResultResponse
{
    [JsonPropertyName("id")]
    public required int Id { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("first_air_date")]
    public required DateOnly FirstAirDate { get; init; }

    [JsonPropertyName("poster_path")]
    public required string PosterPath { get; init; }

    [JsonPropertyName("vote_average")]
    public required double VoteAverage { get; init; }

    [JsonPropertyName("vote_count")]
    public required int VoteCount { get; init; }
}
