namespace Casette.Api.Infrastructure.Requests;

public sealed class LoginRequest
{
    public required string AccessKey { get; init; }
    public bool RememberMe { get; init; } = false;
}
