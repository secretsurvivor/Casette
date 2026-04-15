namespace Casette.Api.Infrastructure.Responses;

public sealed class CollectionResponse
{
    public required Guid Id { get; init; }
    public required string Title { get; init; }
    public required IEnumerable<CollectionEntryResponse> Entries { get; init; }
}

public sealed class CollectionEntryResponse
{
    public required Guid EntryId { get; init; }
    public required string Title { get; init; }
    public required int Position { get; init; }
    public required string PosterPath { get; init; }
}
