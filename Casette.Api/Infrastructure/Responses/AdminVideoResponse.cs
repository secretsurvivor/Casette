namespace Casette.Api.Infrastructure.Responses;

public sealed class AdminVideoResponse
{
    public required Guid Id { get; init; }
    public required Guid EntryId { get; init; }
    public required string EntryTitle { get; init; }
    public required string Filename { get; init; }
    public required double DurationInSeconds { get; init; }
    public required bool IsDefault { get; init; }
    public required DateTime Created { get; init; }
    public required int MarkerCount { get; init; }
}
