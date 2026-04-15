using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Entry : IRegisteredEntity
{
    public required Guid Id { get; init; }
    public required string Title { get; set; }
    public required int DetailId { get; init; }
    public Detail Detail { get; init; } = default!;
    public required DateTime Created { get; init; }
    public required EntryType Type { get; init; }
    public IList<Video> Videos { get; init; } = [];
    public IList<Season> Seasons { get; init; } = [];
    public IList<CollectionEntry> CollectionEntries { get; init; } = [];
    public IList<Tag> Tags { get; set; } = [];
    public bool IsVisible { get; set; }

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Entry>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired();

            e.HasOne(x => x.Detail)
                .WithMany()
                .HasForeignKey(x => x.DetailId);

            e.Property(x => x.Created).IsRequired();
            e.Property(x => x.Type).IsRequired();

            e.HasMany(x => x.Videos)
                .WithOne(x => x.Entry)
                .HasForeignKey(x => x.EntryId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(x => x.Seasons)
                .WithOne(x => x.Entry)
                .HasForeignKey(x => x.EntryId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(x => x.CollectionEntries)
                .WithOne(x => x.Entry)
                .HasForeignKey(x => x.EntryId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(x => x.Tags)
                .WithMany();

            e.Property(x => x.IsVisible).HasDefaultValue(true);
        });
    }
}
