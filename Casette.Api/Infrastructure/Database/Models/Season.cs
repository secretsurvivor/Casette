using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Season : IRegisteredEntity
{
    public required Guid Id { get; init; }
    public required int Position { get; set; }
    public required Guid EntryId { get; init; }
    public Entry Entry { get; init; } = default!;
    public IList<Episode> Episodes { get; init; } = [];

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Season>(e => {
            e.HasKey(e => e.Id);
            e.Property(e => e.Position).IsRequired();
            e.HasIndex(x => new { x.EntryId, x.Position }).IsUnique();
            e.HasMany(x => x.Episodes)
                .WithOne(x => x.Season)
                .HasForeignKey(x => x.SeasonId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
