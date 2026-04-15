using Casette.Api.Infrastructure.Database.Models;
using Microsoft.EntityFrameworkCore;
using Tag = Casette.Api.Infrastructure.Database.Models.Tag;

namespace Casette.Api.Infrastructure.Database;

public class CasetteDbContext(DbContextOptions<CasetteDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.RegisterEntity<Account>();
        builder.RegisterEntity<Collection>();
        builder.RegisterEntity<CollectionEntry>();
        builder.RegisterEntity<Detail>();
        builder.RegisterEntity<Entry>();
        builder.RegisterEntity<Episode>();
        builder.RegisterEntity<Progress>();
        builder.RegisterEntity<Season>();
        builder.RegisterEntity<Tag>();
        builder.RegisterEntity<Video>();
        builder.RegisterEntity<VideoMarker>();
    }

    public DbSet<Account> Accounts { get; set; }
    public DbSet<Collection> Collections { get; set; }
    public DbSet<CollectionEntry> CollectionEntries { get; set; }
    public DbSet<Detail> Details { get; set; }
    public DbSet<Entry> Entries { get; set; }
    public DbSet<Episode> Episodes { get; set; }
    public DbSet<Progress> Progresses { get; set; }
    public DbSet<Season> Seasons { get; set; }
    public DbSet<Tag> Tags { get; set; }
    public DbSet<Video> Videos { get; set; }
    public DbSet<VideoMarker> VideoMarkers { get; set; }
}
