using Casette.Api.Infrastructure.Requests;
using Casette.Api.Infrastructure.Responses.Tmdb;

namespace Casette.Api.Infrastructure.Services;

public interface ITmdbClient
{
    Task<TmdbSearchMovieResponse> SearchMovieAsync(TmdbSearchRequest request, CancellationToken cancellationToken);
    Task<TmbdMoviesDetailsResponse> GetMovieAsync(int tmdbId, CancellationToken cancellationToken);
    Task<TmdbSearchTvResponse> SearchTvShowAsync(TmdbSearchRequest request, CancellationToken cancellationToken);
    Task<TmbdTvDetailsResponse> GetTvShowAsync(int tmdbId, CancellationToken cancellationToken);
}

public sealed class TmdbClient(HttpClient httpClient) : ITmdbClient
{
    public async Task<TmbdMoviesDetailsResponse> GetMovieAsync(int tmdbId, CancellationToken cancellationToken)
    {
        return await httpClient.GetFromJsonAsync<TmbdMoviesDetailsResponse>($"movie/{tmdbId}", JsonOptions.Default, cancellationToken)
            ?? throw new InvalidOperationException($"Failed to get movie details for TMDB ID: {tmdbId}");
    }

    public async Task<TmbdTvDetailsResponse> GetTvShowAsync(int tmdbId, CancellationToken cancellationToken)
    {
        return await httpClient.GetFromJsonAsync<TmbdTvDetailsResponse>($"tv/{tmdbId}", JsonOptions.Default, cancellationToken)
            ?? throw new InvalidOperationException($"Failed to get TV show details for TMDB ID: {tmdbId}");
    }

    public async Task<TmdbSearchMovieResponse> SearchMovieAsync(TmdbSearchRequest request, CancellationToken cancellationToken)
    {
        return await httpClient.GetFromJsonAsync<TmdbSearchMovieResponse>($"search/movie?query={Uri.EscapeDataString(request.Query)}&page={request.Page}", JsonOptions.Default, cancellationToken)
            ?? throw new InvalidOperationException($"Failed to search movies with query: {request.Query}");
    }

    public async Task<TmdbSearchTvResponse> SearchTvShowAsync(TmdbSearchRequest request, CancellationToken cancellationToken)
    {
        return await httpClient.GetFromJsonAsync<TmdbSearchTvResponse>($"search/tv?query={Uri.EscapeDataString(request.Query)}&page={request.Page}", JsonOptions.Default, cancellationToken)
            ?? throw new InvalidOperationException($"Failed to search TV shows with query: {request.Query}");
    }
}
