namespace Casette.Api.Infrastructure.Responses;

public sealed class EntryDetailResponse
{
    public required Guid Id { get; init; }
    public required string Title { get; init; }
    public required string Overview { get; init; }
    public required DateOnly ReleaseDate { get; init; }
    public required string PosterPath { get; init; }
    public required string? BackdropPath { get; init; }
    public required Guid VideoId { get; init; }
    public required IEnumerable<VideoMarkerResponse> VideoMarkers { get; init; }
    public required double DurationInSeconds { get; init; }
    public required double? CurrentProgressInSeconds { get; init; }
    public required bool InCollection { get; init; }
    public required bool IsSeries { get; init; }
}
