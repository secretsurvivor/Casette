namespace Casette.Api.Infrastructure.Configuration;

public sealed class JwtOptions
{
    public required string Secret { get; init; }
}
