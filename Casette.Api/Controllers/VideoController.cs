using Casette.Api.Infrastructure.Database;
using Casette.Api.Infrastructure.Database.Models;
using Casette.Api.Infrastructure.Extensions;
using Casette.Api.Infrastructure.Requests.Video;
using Casette.Api.Infrastructure.Responses;
using Casette.Api.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Controllers;

[ApiController, Authorize, Route("video")]
public class VideoController(CasetteDbContext dbContext, IConfiguration configuration, ILogger<VideoController> logger) : ControllerBase
{
    [HttpGet("{id:guid}/stream")]
    public async Task<IActionResult> GetStreamToken(Guid id, [FromServices] IStreamTokenService tokenService, CancellationToken cancellationToken)
    {
        var video = await dbContext.Videos.FindAsync([id], cancellationToken: cancellationToken);

        if (video is null)
        {
            return NotFound();
        }

        return Ok(new { streamUrl = $"/v/{tokenService.GenerateStreamToken(video)}" });
    }

    [HttpGet("{id:guid}/markers"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> GetMarkers(Guid id, CancellationToken cancellationToken)
    {
        var markers = await dbContext.VideoMarkers
            .Where(m => m.VideoId == id)
            .Select(m => new VideoMarkerResponse
            {
                Id = m.Id,
                StartInSeconds = m.StartInSeconds,
                EndInSeconds = m.EndInSeconds,
                Type = m.Type
            })
            .OrderBy(m => m.StartInSeconds)
            .ToListAsync(cancellationToken);
        return Ok(markers);
    }

    public const long MaxFileSize = 5_000_000_000;

    [RequestSizeLimit(MaxFileSize), RequestFormLimits(MultipartBodyLengthLimit = MaxFileSize), HttpPost("upload"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file,
        [FromForm] VideoUploadRequest request,
        [FromServices] IUploadService uploadService,
        CancellationToken cancellationToken)
    {
        var entry = await dbContext.Entries.FindAsync([request.EntryId], cancellationToken);

        if (entry is null)
        {
            return NotFound();
        }

        bool nameAlreadyExists = await dbContext.Videos.AnyAsync(x => x.Filename == file.FileName, cancellationToken: cancellationToken);

        if (nameAlreadyExists)
        {
            return BadRequest("Filename already exists");
        }

        await using var stream = file.OpenReadStream();
        var tagFile = TagLib.File.Create(file.FileName, stream);
        double duration = tagFile.Properties.Duration.TotalSeconds;

        stream.Position = 0; // Reset stream position after reading metadata

        string objectKey = await uploadService.UploadAsync(stream, file.Length, cancellationToken);

        try
        {
            var video = new Video
            {
                Id = Guid.CreateVersion7(),
                EntryId = entry.Id,
                Created = DateTime.UtcNow,
                ObjectKey = objectKey,
                Filename = file.FileName,
                DurationInSeconds = duration,
                IsDefault = false,
            };

            await dbContext.Videos.AddAsync(video, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);

            return Ok(video.Id);
        }
        catch
        {
            await uploadService.DeleteAsync(objectKey, CancellationToken.None);
            throw;
        }
    }

    [HttpPut("{id:guid}/default"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> SetDefaultVideo(Guid id, CancellationToken cancellationToken)
    {
        var video = await dbContext.Videos.FindAsync([id], cancellationToken: cancellationToken);

        if (video is null)
        {
            return NotFound();
        }

        var siblings = await dbContext.Videos
            .Where(v => v.EntryId == video.EntryId && v.IsDefault)
            .ToListAsync(cancellationToken);

        foreach (var sibling in siblings)
        {
            sibling.IsDefault = false;
        }

        video.IsDefault = true;
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("marker"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> CreateVideoMarker([FromBody] VideoMarkerCreateRequest request, CancellationToken cancellationToken)
    {
        var videoMarker = new VideoMarker
        {
            Id = Guid.CreateVersion7(),
            VideoId = request.VideoId,
            StartInSeconds = request.StartInSeconds,
            EndInSeconds = request.EndInSeconds,
            Type = request.Type,
        };

        await dbContext.VideoMarkers.AddAsync(videoMarker, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(videoMarker.Id);
    }

    [HttpPut("marker/{id:guid}"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> UpdateVideoMarker(Guid id, [FromBody] VideoMarkerUpdateRequest request, CancellationToken cancellationToken)
    {
        var videoMarker = await dbContext.VideoMarkers.FindAsync([id], cancellationToken: cancellationToken);

        if (videoMarker is null)
        {
            return NotFound();
        }

        videoMarker.StartInSeconds = request.StartInSeconds;
        videoMarker.EndInSeconds = request.EndInSeconds;
        videoMarker.Type = request.Type;

        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("marker/{id:guid}"), Authorize(AuthPolicy.AdminOnly)]
    public async Task<IActionResult> DeleteVideoMarker(Guid id, CancellationToken cancellationToken)
    {
        var videoMarker = await dbContext.VideoMarkers.FindAsync([id], cancellationToken: cancellationToken);

        if (videoMarker is null)
        {
            return NotFound();
        }

        dbContext.VideoMarkers.Remove(videoMarker);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPut("{videoId:guid}/progress")]
    public async Task<IActionResult> SaveProgress(Guid videoId, [FromBody] double positionInSeconds, [FromServices] IUserContext userContext, CancellationToken cancellationToken)
    {
        await SaveProgressAsync(videoId, positionInSeconds, userContext.AccountId);
        return Accepted();
    }

    private async Task SaveProgressAsync(Guid videoId, double positionInSeconds, Guid accountId)
    {
        try
        {
            var progress = await dbContext.Progresses.FirstOrDefaultAsync(x => x.VideoId == videoId && x.AccountId == accountId);

            if (progress is null)
            {
                await dbContext.Progresses
                    .Where(p => p.AccountId == accountId && p.VideoId != videoId && p.Video.EntryId == dbContext.Videos
                        .Where(v => v.Id == videoId)
                        .Select(v => v.EntryId)
                        .First())
                    .ExecuteDeleteAsync();

                dbContext.Progresses.Add(new Progress
                {
                    VideoId = videoId,
                    AccountId = accountId,
                    PositionInSeconds = positionInSeconds,
                    Updated = DateTime.UtcNow,
                });
            }
            else
            {
                progress.PositionInSeconds = positionInSeconds;
                progress.Updated = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save progress for accountId {AccountId} and videoId {VideoId}", accountId, videoId);
        }
    }
}
