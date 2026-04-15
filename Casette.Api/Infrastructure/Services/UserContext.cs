using Casette.Api.Controllers;
using System.Security.Claims;

namespace Casette.Api.Infrastructure.Services;

public interface IUserContext
{
    public Guid AccountId { get; }
    public bool IsAdmin { get; }
}

public sealed class UserContext(IHttpContextAccessor httpContextAccessor) : IUserContext
{
    private readonly ClaimsPrincipal _claimsPrincipal = httpContextAccessor.HttpContext?.User ?? new ClaimsPrincipal();

    public Guid AccountId => _claimsPrincipal.GetAccountId();
    public bool IsAdmin => _claimsPrincipal.GetIsAdmin();
}

file static class UserContextExtensions
{
    public static bool TryGetClaimValue(this ClaimsPrincipal claimsPrincipal, string claimType, out string value)
    {
        var claim = claimsPrincipal.Claims.FirstOrDefault(c => c.Type == claimType);

        if (claim is not null)
        {
            value = claim.Value;
            return true;
        }

        value = default!;
        return false;
    }

    public static Guid GetAccountId(this ClaimsPrincipal claimsPrincipal)
    {
        if (claimsPrincipal.TryGetClaimValue(ClaimConstants.AccountId, out string? value) && Guid.TryParse(value, out var accountId))
        {
            return accountId;
        }

        return default;
    }

    public static bool GetIsAdmin(this ClaimsPrincipal claimsPrincipal)
    {
        if (claimsPrincipal.TryGetClaimValue(ClaimConstants.IsAdmin, out string? value) && bool.TryParse(value, out bool isAdmin))
        {
            return isAdmin;
        }

        return default;
    }
}
