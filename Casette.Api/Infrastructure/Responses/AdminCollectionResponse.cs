using Casette.Api.Infrastructure.Database;

namespace Casette.Api.Infrastructure.Responses;

public class AdminCollectionResponse
{
    public required Guid Id { get; init; }
    public required string Title { get; init; }
    public required IEnumerable<AdminCollectionEntryResponse> Entries { get; init; }
}
