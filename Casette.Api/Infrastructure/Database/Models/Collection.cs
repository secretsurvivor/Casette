using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Collection : IRegisteredEntity
{
    public required Guid Id { get; init; }
    public required string Title { get; set; }
    public IList<CollectionEntry> Entries { get; init; } = [];

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Collection>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired();
            e.HasMany(x => x.Entries)
                .WithOne(x => x.Collection)
                .HasForeignKey(x => x.CollectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
