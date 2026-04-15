using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database.Models;

public sealed record Account : IRegisteredEntity
{
    public required Guid Id { get; init; }
    public required string KeyId { get; init; }
    public required string SecretHash { get; init; }
    public bool IsAdmin { get; set; } = false;

    public IList<Progress> Progresses { get; init; } = [];

    public static void Register(ModelBuilder builder)
    {
        builder.Entity<Account>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.KeyId).IsRequired();
            e.Property(x => x.SecretHash).IsRequired();
            e.HasIndex(x => x.KeyId).IsUnique();
            e.Property(x => x.IsAdmin).HasDefaultValue(false);
            e.HasMany(x => x.Progresses)
                .WithOne(x => x.Account)
                .HasForeignKey(x => x.AccountId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
