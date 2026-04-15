using Microsoft.EntityFrameworkCore;

namespace Casette.Api.Infrastructure.Database;

internal static class DbExtensions
{
    public static ModelBuilder RegisterEntity<T>(this ModelBuilder modelBuilder) where T : IRegisteredEntity
    {
        T.Register(modelBuilder);
        return modelBuilder;
    }
}

public interface IRegisteredEntity
{
    abstract static void Register(ModelBuilder builder);
}
