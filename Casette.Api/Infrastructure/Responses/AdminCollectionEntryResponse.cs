namespace Casette.Api.Infrastructure.Responses;

public sealed class AdminCollectionEntryResponse
{
    public required Guid EntryId { get; init; }
    public required int Position { get; init; }
}
