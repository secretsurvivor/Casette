using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Detail : IRegisteredEntity
{
    public required int Id { get; init; }
    public required string Overview { get; set; }
    public required double Popularity { get; set; }
    public required DateOnly ReleaseDate { get; set; }
    public required string PosterPath { get; set; }
    public string? BackdropPath { get; set; }

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Detail>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.Overview).IsRequired();
            e.Property(x => x.Popularity).IsRequired();
            e.Property(x => x.ReleaseDate).IsRequired();
            e.Property(x => x.PosterPath).IsRequired();
            e.Property(x => x.BackdropPath);
        });
    }
}
