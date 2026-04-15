namespace Casette.Api.Infrastructure.Requests.Season;

public sealed class EpisodeCreateRequest
{
    public required int Position { get; init; }
    public required Guid VideoId { get; init; }
}
