using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Episode : IRegisteredEntity
{
    public required Guid SeasonId { get; init; }
    public Season Season { get; init; } = default!;

    public required Guid VideoId { get; set; }
    public Video Video { get; init; } = default!;

    public required int Position { get; set; }

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Episode>(e => {
            e.HasKey(x => new { x.SeasonId, x.VideoId });
            e.Property(x => x.Position).IsRequired();
            e.HasIndex(x => new { x.SeasonId, x.Position }).IsUnique();
        });
    }
}
