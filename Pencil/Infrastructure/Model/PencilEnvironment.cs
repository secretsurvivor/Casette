using ProtoBuf;

namespace Pencil.Infrastructure.Model;

[ProtoContract]
internal sealed class PencilEnvironment
{
    [ProtoMember(1)]
    public string? JwtToken { get; set; }

    [ProtoMember(2)]
    public long TokenExpirationUnix { get; set; }

    [ProtoMember(3)]
    public string? BackendUri { get; set; }

    public DateTime TokenExpiration
    {
        get => DateTimeOffset.FromUnixTimeSeconds(TokenExpirationUnix).DateTime;
        set => TokenExpirationUnix = new DateTimeOffset(value).ToUnixTimeSeconds();
    }
}