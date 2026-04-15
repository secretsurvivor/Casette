using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Video : IRegisteredEntity
{
    public required Guid Id { get; init; }
    public required string ObjectKey { get; init; }
    public required string Filename { get; init; }
    public required DateTime Created { get; init; }
    public required double DurationInSeconds { get; init; }
    public required Guid EntryId { get; init; }
    public Entry Entry { get; init; } = default!;
    public bool IsDefault { get; set; }

    public IList<Progress> Progresses { get; init; } = [];
    public IList<VideoMarker> Markers { get; init; } = [];

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Video>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.ObjectKey).IsRequired();
            e.Property(x => x.Created).IsRequired();
            e.Property(x => x.IsDefault).HasDefaultValue(false);

            e.HasMany(x => x.Progresses)
                .WithOne(x => x.Video)
                .HasForeignKey(x => x.VideoId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(x => x.Markers)
                .WithOne(x => x.Video)
                .HasForeignKey(x => x.VideoId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
