namespace Casette.Api.Infrastructure.Requests.Entry;

public sealed class EntryUpdateRequest
{
    public required string Title { get; init; }
    public required bool IsVisible { get; init; }
    public required IReadOnlyList<string> Tags { get; init; }
}
