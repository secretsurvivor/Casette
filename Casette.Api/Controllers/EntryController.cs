using Casette.Api.Infrastructure.Database;
using Casette.Api.Infrastructure.Database.Models;
using Casette.Api.Infrastructure.Requests.Entry;
using Casette.Api.Infrastructure.Responses;
using Casette.Api.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tag = Casette.Api.Infrastructure.Database.Models.Tag;

namespace Casette.Api.Controllers;

[ApiController, Authorize, Route("entry")]
public sealed class EntryController(CasetteDbContext dbContext) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetails(Guid id, [FromServices] IUserContext userContext)
    {
        var details = await dbContext.Entries.Where(x => x.Id == id)
            .Select(x => new EntryDetailResponse
            {
                Id = x.Id,
                Title = x.Title,
                Overview = x.Detail.Overview,
                ReleaseDate = x.Detail.ReleaseDate,
                PosterPath = x.Detail.PosterPath,
                BackdropPath = x.Detail.BackdropPath,
                VideoId = x.Videos
                    .Where(y => y.IsDefault)
                    .Select(y => y.Id)
                    .FirstOrDefault(),
                VideoMarkers = x.Videos
                    .Where(y => y.IsDefault)
                    .SelectMany(y => y.Markers)
                    .Select(y => new VideoMarkerResponse
                    {
                        Id = y.Id,
                        StartInSeconds = y.StartInSeconds,
                        EndInSeconds = y.EndInSeconds,
                        Type = y.Type
                    }),
                DurationInSeconds = x.Videos
                    .Where(y => y.IsDefault)
                    .Select(y => y.DurationInSeconds)
                    .FirstOrDefault(),
                CurrentProgressInSeconds = x.Videos
                    .Where(y => y.IsDefault)
                    .SelectMany(y => y.Progresses)
                    .Where(y => y.AccountId == userContext.AccountId)
                    .Select(y => y.PositionInSeconds)
                    .FirstOrDefault(),
                InCollection = x.CollectionEntries.Any(),
                IsSeries = x.Seasons.Any()
            })
            .FirstOrDefaultAsync();

        if (details is null)
        {
            return NotFound();
        }

        return Ok(details);
    }

    [HttpPost, Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> CreateEntry([FromBody] EntryCreateRequest request, [FromServices] ITmdbClient tmdbClient, CancellationToken cancellationToken)
    {
        var detail = await tmdbClient.GetDetails(request.TmdbId, request.Type, cancellationToken);

        dbContext.Details.Add(detail);

        var entry = new Entry
        {
            Id = Guid.CreateVersion7(),
            Title = request.Title,
            DetailId = detail.Id,
            Created = DateTime.UtcNow,
            Type = request.Type,
            IsVisible = request.IsVisible,
            Tags = [.. await ResolveTagsAsync(request.Tags, cancellationToken)]
        };

        await dbContext.Entries.AddAsync(entry, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(entry.Id);
    }

    [HttpPut("{id:guid}"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> UpdateEntry(Guid id, [FromBody] EntryUpdateRequest request, CancellationToken cancellationToken)
    {
        var entry = await dbContext.Entries.FindAsync([id], cancellationToken: cancellationToken);

        if (entry is null)
        {
            return NotFound();
        }

        entry.Title = request.Title;
        entry.IsVisible = request.IsVisible;
        entry.Tags = [.. await ResolveTagsAsync(request.Tags, cancellationToken)];

        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> DeleteEntry(Guid id, CancellationToken cancellationToken)
    {
        var entry = await dbContext.Entries.FindAsync([id], cancellationToken: cancellationToken);

        if (entry is null)
        {
            return NotFound();
        }

        dbContext.Entries.Remove(entry);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<IReadOnlyList<Tag>> ResolveTagsAsync(IEnumerable<string> tagNames, CancellationToken cancellationToken)
    {
        var names = tagNames.Select(x => x.Trim()).Where(x => !string.IsNullOrEmpty(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var existingTags = await dbContext.Tags
            .Where(x => names.Contains(x.Name))
            .ToListAsync(cancellationToken);

        var existingNames = existingTags.Select(x => x.Name).ToHashSet();
        var newTags = names
            .Where(x => !existingNames.Contains(x))
            .Select(x => new Tag { Id = Guid.CreateVersion7(), Name = x })
            .ToList();

        if (newTags.Count > 0)
        {
            dbContext.Tags.AddRange(newTags);
        }

        return [.. existingTags, .. newTags];
    }
}

file static class EntryControllerExtensions
{
    public static async Task<Detail> GetDetails(this ITmdbClient tmdbClient, int tmdbId, EntryType type, CancellationToken cancellationToken)
    {
        if (type == EntryType.Film)
        {
            var response = await tmdbClient.GetMovieAsync(tmdbId, cancellationToken);
            return new Detail
            {
                Id = tmdbId,
                Overview = response.Overview,
                ReleaseDate = response.ReleaseDate,
                PosterPath = response.PosterPath,
                BackdropPath = response.BackdropPath,
                Popularity = response.VoteAverage * Math.Log(response.VoteCount + 1) // Arbitrary popularity calculation based on TMDb data
            };
        }
        else
        {
            var response = await tmdbClient.GetTvShowAsync(tmdbId, cancellationToken);
            return new Detail
            {
                Id = tmdbId,
                Overview = response.Overview,
                ReleaseDate = response.FirstAirDate,
                PosterPath = response.PosterPath,
                BackdropPath = response.BackdropPath,
                Popularity = response.VoteAverage * Math.Log(response.VoteCount + 1) // Arbitrary popularity calculation based on TMDb data
            };
        }
    }
}
