namespace Casette.Api.Infrastructure.Responses;

public sealed class AdminEpisodeResponse
{
    public required Guid VideoId { get; init; }
    public required int Position { get; init; }
}
