namespace Casette.Api.Infrastructure.Requests.Video;

public sealed class VideoUploadRequest
{
    public required Guid EntryId { get; init; }
    public required bool IsDefault { get; init; }
}