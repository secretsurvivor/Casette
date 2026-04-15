using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Tag : IRegisteredEntity
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Tag>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasColumnType("citext");
            e.HasIndex(x => x.Name).IsUnique();
        });
    }
}
