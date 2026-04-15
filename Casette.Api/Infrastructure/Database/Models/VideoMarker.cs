using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record VideoMarker : IRegisteredEntity
{
    public required Guid Id { get; init; }
    public required Guid VideoId { get; init; }
    public Video Video { get; init; } = default!;
    public required double StartInSeconds { get; set; }
    public required double EndInSeconds { get; set; }
    public required VideoMarkerType Type { get; set; }

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<VideoMarker>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.StartInSeconds).IsRequired();
            e.Property(x => x.EndInSeconds).IsRequired();
            e.Property(x => x.Type).IsRequired();
        });
    }
}