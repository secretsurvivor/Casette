namespace Casette.Api.Infrastructure.Responses;

public sealed class SeasonResponse
{
    public required Guid Id { get; init; }
    public required Guid EntryId { get; init; }
    public required int Position { get; init; }
    public required IEnumerable<EpisodeResponse> Episodes { get; init; }
}

public sealed class EpisodeResponse
{
    public required int Position { get; init; }
    public required Guid VideoId { get; init; }
    public required IEnumerable<VideoMarkerResponse> VideoMarkers { get; init; }
}
