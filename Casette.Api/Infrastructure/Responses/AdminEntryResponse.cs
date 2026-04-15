using Casette.Api.Infrastructure.Database.Models;

namespace Casette.Api.Infrastructure.Responses;

public sealed class AdminEntryResponse
{
    public required Guid Id { get; init; }
    public required string Title { get; init; }
    public required EntryType Type { get; init; }
    public required bool IsVisible { get; init; }
    public required string PosterPath { get; init; }
    public required IEnumerable<string> Tags { get; init; }
    public required int VideoCount { get; init; }
}
