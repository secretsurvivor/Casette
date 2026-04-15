using Casette.Api.Infrastructure.Database.Models;

namespace Casette.Api.Infrastructure.Responses;

public sealed class EntryListResponse
{
    public required Guid Id { get; init; }
    public required string Title { get; init; }
    public required EntryType Type { get; init; }
    public required double Popularity { get; init; }
    public required DateOnly ReleaseDate { get; init; }
    public required double DurationInSeconds { get; init; }
    public required string PosterPath { get; init; }
    public required string BackdropPath { get; init; }
}
