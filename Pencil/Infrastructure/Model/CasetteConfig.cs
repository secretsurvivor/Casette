namespace Pencil.Infrastructure.Model;

internal sealed class CasetteConfig
{
    public required string BackendHost { get; init; }
    public required int BackendPort { get; init; }
}
