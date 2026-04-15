using Pencil.Infrastructure.Model;
using System.Diagnostics.CodeAnalysis;

namespace Pencil.Infrastructure.Services;

internal interface IKeyVault
{
    bool TryGetValidToken([MaybeNullWhen(false)] out string token);
}

internal sealed class KeyVault(IEnvironmentStore environmentStore) : IKeyVault
{
    private readonly Lazy<PencilEnvironment> _environment = new Lazy<PencilEnvironment>(environmentStore.LoadConfig);

    public bool TryGetValidToken([MaybeNullWhen(false)] out string token)
    {
        var env = _environment.Value;

        if (env.JwtToken is not null && env.TokenExpiration < DateTime.UtcNow)
        {
            token = env.JwtToken;
            return true;
        }

        token = default;
        return false;
    }
}
