using Casette.Api.Infrastructure.Database.Models;

namespace Casette.Api.Infrastructure.Requests.Entry;

public class EntryCreateRequest
{
    public required string Title { get; init; }
    public required EntryType Type { get; init; }
    public required int TmdbId { get; init; }
    public required bool IsVisible { get; init; }
    public IReadOnlyList<string> Tags { get; init; } = [];
}
