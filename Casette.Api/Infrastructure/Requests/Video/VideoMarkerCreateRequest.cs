using Casette.Api.Infrastructure.Database.Models;

namespace Casette.Api.Infrastructure.Requests.Video;

public sealed class VideoMarkerCreateRequest
{
    public required Guid VideoId { get; init; }
    public required double StartInSeconds { get; init; }
    public required double EndInSeconds { get; init; }
    public required VideoMarkerType Type { get; init; }
}
