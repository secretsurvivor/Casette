using Casette.Api.Infrastructure.Database;

namespace Casette.Api.Infrastructure.Responses;

public sealed class AdminSeasonResponse
{
    public required Guid Id { get; init; }
    public required Guid EntryId { get; init; }
    public required int Position { get; init; }
    public required IEnumerable<AdminEpisodeResponse> Episodes { get; init; }
}
