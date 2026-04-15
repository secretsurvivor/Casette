namespace Casette.Api.Infrastructure.Responses;

public sealed class ProgressResponse
{
    public required Guid VideoId { get; init; }
    public required Guid EntryId { get; init; }
    public required string PosterPath { get; init; }
    public required string BackdropPath { get; init; }
    public required double PositionInSeconds { get; init; }
    public required double DurationInSeconds { get; init; }
}
