using Casette.Api.Infrastructure.Requests;
using Casette.Api.Infrastructure.Responses.Tmdb;
using Casette.Api.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casette.Api.Controllers;

[ApiController, Authorize, Route("tmdb")]
public sealed class TmdbController(ITmdbClient tmdbClient) : ControllerBase
{
    [HttpGet("movie/{tmdbId:int}")]
    public async Task<IActionResult> GetMovie(int tmdbId, CancellationToken cancellationToken)
    {
        var result = await tmdbClient.GetMovieAsync(tmdbId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("tv/{tmdbId:int}")]
    public async Task<IActionResult> GetTvShow(int tmdbId, CancellationToken cancellationToken)
    {
        var result = await tmdbClient.GetTvShowAsync(tmdbId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("search/movie"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> SearchMovies([FromQuery] string query, [FromQuery] int page = 1, CancellationToken cancellationToken = default)
    {
        var result = await tmdbClient.SearchMovieAsync(new TmdbSearchRequest { Query = query, Page = page }, cancellationToken);
        var normalise = new TmdbSearchResponse
        {
            Page = result.Page,
            TotalPages = result.TotalPages,
            TotalResults = result.TotalResults,
            Results = result.Results.Select(x => new TmdbSearchResultResponse
            {
                Id = x.Id,
                Title = x.Title,
                ReleaseDate = x.ReleaseDate.ToString(),
                PosterPath = x.PosterPath,
                VoteAverage = x.VoteAverage,
                VoteCount = x.VoteCount,
            })
        };

        return Ok(normalise);
    }

    [HttpGet("search/tv"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> SearchTvShows([FromQuery] string query, [FromQuery] int page = 1, CancellationToken cancellationToken = default)
    {
        var result = await tmdbClient.SearchTvShowAsync(new TmdbSearchRequest { Query = query, Page = page }, cancellationToken);
        var normalise = new TmdbSearchResponse
        {
            Page = result.Page,
            TotalPages = result.TotalPages,
            TotalResults = result.TotalResults,
            Results = result.Results.Select(x => new TmdbSearchResultResponse
            {
                Id = x.Id,
                Title = x.Name,
                ReleaseDate = x.FirstAirDate.ToString(),
                PosterPath = x.PosterPath,
                VoteAverage = x.VoteAverage,
                VoteCount = x.VoteCount,
            })
        };

        return Ok(normalise);
    }
}
