using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Progress : IRegisteredEntity
{
    public required Guid AccountId { get; init; }
    public Account Account { get; init; } = default!;

    public required Guid VideoId { get; init; }
    public Video Video { get; init; } = default!;

    public required double PositionInSeconds { get; set; }
    public required DateTime Updated { get; set; }

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Progress>(e => {
            e.HasKey(x => new { x.AccountId, x.VideoId });
            e.Property(x => x.PositionInSeconds).IsRequired();
        });
    }
}
