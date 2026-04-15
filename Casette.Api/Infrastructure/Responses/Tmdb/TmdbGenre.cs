using System.Text.Json.Serialization;

namespace Casette.Api.Infrastructure.Responses.Tmdb;

public sealed class TmdbGenre
{
    [JsonPropertyName("id")]
    public required int Id { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }
}
