using System.Text.Json.Serialization;

namespace Casette.Api.Infrastructure.Responses.Tmdb;

public sealed class TmbdMoviesDetailsResponse
{
    [JsonPropertyName("id")]
    public required int Id { get; init; }

    [JsonPropertyName("title")]
    public required string Title { get; init; }

    [JsonPropertyName("backdrop_path")]
    public required string BackdropPath { get; init; }

    [JsonPropertyName("overview")]
    public required string Overview { get; init; }

    [JsonPropertyName("poster_path")]
    public required string PosterPath { get; init; }

    [JsonPropertyName("release_date")]
    public required DateOnly ReleaseDate { get; init; }

    [JsonPropertyName("runtime")]
    public int? Runtime { get; init; }

    [JsonPropertyName("genres")]
    public IReadOnlyList<TmdbGenre>? Genres { get; init; }

    [JsonPropertyName("vote_average")]
    public required double VoteAverage { get; init; }

    [JsonPropertyName("vote_count")]
    public required int VoteCount { get; init; }
}
