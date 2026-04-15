using Casette.Api.Infrastructure.Database;
using Casette.Api.Infrastructure.Database.Models;
using Casette.Api.Infrastructure.Requests.Season;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casette.Api.Controllers;

[ApiController, Authorize(AuthPolicy.AdminOnly), Route("season")]
public sealed class SeasonController(CasetteDbContext dbContext) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateSeason([FromBody] SeasonCreateRequest request, CancellationToken cancellationToken)
    {
        var season = new Season
        {
            Id = Guid.CreateVersion7(),
            Position = request.Position,
            EntryId = request.EntryId,
        };

        await dbContext.Seasons.AddAsync(season, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(season.Id);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSeason(Guid id, [FromBody] SeasonUpdateRequest request, CancellationToken cancellationToken)
    {
        var season = await dbContext.Seasons.FindAsync([id], cancellationToken: cancellationToken);

        if (season is null)
        {
            return NotFound();
        }

        season.Position = request.Position;

        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSeason(Guid id, CancellationToken cancellationToken)
    {
        var season = await dbContext.Seasons.FindAsync([id], cancellationToken: cancellationToken);

        if (season is null)
        {
            return NotFound();
        }

        dbContext.Seasons.Remove(season);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("{seasonId:guid}/episode")]
    public async Task<IActionResult> CreateEpisode(Guid seasonId, [FromBody] EpisodeCreateRequest request, CancellationToken cancellationToken)
    {
        var season = await dbContext.Seasons.FindAsync([seasonId], cancellationToken: cancellationToken);

        if (season is null)
        {
            return NotFound();
        }

        var episode = new Episode
        {
            Position = request.Position,
            VideoId = request.VideoId,
            SeasonId = seasonId,
        };

        await dbContext.Episodes.AddAsync(episode, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPut("{seasonId:guid}/episode/{videoId:guid}")]
    public async Task<IActionResult> UpdateEpisode(Guid seasonId, Guid videoId, [FromBody] EpisodeUpdateRequest request, CancellationToken cancellationToken)
    {
        var episode = await dbContext.Episodes.FindAsync([seasonId, videoId], cancellationToken: cancellationToken);

        if (episode is null)
        {
            return NotFound();
        }

        episode.Position = request.Position;

        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{seasonId:guid}/episode/{videoId:guid}")]
    public async Task<IActionResult> DeleteEpisode(Guid seasonId, Guid videoId, CancellationToken cancellationToken)
    {
        var episode = await dbContext.Episodes.FindAsync([seasonId, videoId], cancellationToken: cancellationToken);

        if (episode is null)
        {
            return NotFound();
        }

        dbContext.Episodes.Remove(episode);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
