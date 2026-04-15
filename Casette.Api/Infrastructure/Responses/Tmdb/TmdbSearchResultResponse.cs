namespace Casette.Api.Infrastructure.Responses.Tmdb;

public class TmdbSearchResultResponse
{
    public required int Id { get; init; }
    public required string Title { get; init; }
    public required string ReleaseDate { get; init; }
    public required string PosterPath { get; init; }
    public required double VoteAverage { get; init; }
    public required int VoteCount { get; init; }
}

#if false

export interface TmdbSearchResult {
  id: number;
  title: string;
  releaseDate: string;
  posterPath: string;
  voteAverage: number;
  voteCount: number;
}

#endif