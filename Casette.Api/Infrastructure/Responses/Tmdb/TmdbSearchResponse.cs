namespace Casette.Api.Infrastructure.Responses.Tmdb;

public class TmdbSearchResponse
{
    public required int Page { get; init; }
    public required IEnumerable<TmdbSearchResultResponse> Results { get; init; }
    public required int TotalPages { get; init; }
    public required int TotalResults { get; init; }
}

#if false

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  totalPages: number;
  totalResults: number;
}

#endif