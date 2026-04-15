using Casette.Api.Infrastructure.Database.Models;

namespace Casette.Api.Infrastructure.Responses;

public sealed class VideoMarkerResponse
{
    public required Guid Id { get; init; }
    public required double StartInSeconds { get; set; }
    public required double EndInSeconds { get; set; }
    public required VideoMarkerType Type { get; set; }
}
