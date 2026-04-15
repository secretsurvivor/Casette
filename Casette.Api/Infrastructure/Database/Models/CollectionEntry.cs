using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public class CollectionEntry : IRegisteredEntity
{
    public required Guid CollectionId { get; init; }
    public Collection Collection { get; init; } = default!;

    public required Guid EntryId { get; init; }
    public Entry Entry { get; init; } = default!;

    public int Position { get; set; }

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<CollectionEntry>(e => {
            e.HasKey(x => new { x.CollectionId, x.EntryId });
            e.Property(x => x.Position).IsRequired();
            e.HasIndex(x => new { x.CollectionId, x.Position }).IsUnique();
        });
    }
}
