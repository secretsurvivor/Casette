using Casette.Api.Infrastructure.Services;
using System.Text.Json.Serialization;

namespace Casette.Api.Infrastructure.Responses.Tmdb;

public sealed class TmbdTvDetailsResponse
{
    [JsonPropertyName("id")]
    public required int Id { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("backdrop_path")]
    public required string BackdropPath { get; init; }

    [JsonPropertyName("first_air_date")]
    public required DateOnly FirstAirDate { get; init; }

    [JsonPropertyName("overview")]
    public required string Overview { get; init; }

    [JsonPropertyName("poster_path")]
    public required string PosterPath { get; init; }

    [JsonPropertyName("episode_run_time")]
    public IReadOnlyList<int>? EpisodeRunTime { get; init; }

    [JsonPropertyName("genres")]
    public IReadOnlyList<TmdbGenre>? Genres { get; init; }

    [JsonPropertyName("number_of_seasons")]
    public int? NumberOfSeasons { get; init; }

    [JsonPropertyName("vote_average")]
    public required double VoteAverage { get; init; }

    [JsonPropertyName("vote_count")]
    public required int VoteCount { get; init; }
}
