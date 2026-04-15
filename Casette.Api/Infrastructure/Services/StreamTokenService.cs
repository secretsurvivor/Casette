using Casette.Api.Infrastructure.Database.Models;
using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace Casette.Api.Infrastructure.Services;

public interface IStreamTokenService
{
    string GenerateStreamToken(Video video);
    string? GetObjectKeyFromToken(string token);
}

public sealed class StreamTokenService : IStreamTokenService
{
    private readonly ConcurrentDictionary<string, string> _tokenObjectKeyMap = [];

    public string GenerateStreamToken(Video video)
    {
        string token = GenerateRandomToken();
        _tokenObjectKeyMap.TryAdd(token, video.ObjectKey);
        return token;
    }
    public string? GetObjectKeyFromToken(string token)
    {
        _tokenObjectKeyMap.TryGetValue(token, out string? key);
        return key;
    }

    private static string GenerateRandomToken()
    {
        return Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(32));
    }
}
