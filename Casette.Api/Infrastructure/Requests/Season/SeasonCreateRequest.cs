namespace Casette.Api.Infrastructure.Requests.Season;

public sealed class SeasonCreateRequest
{
    public required int Position { get; init; }
    public required Guid EntryId { get; init; }
}
