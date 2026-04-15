using Casette.Api.Controllers;
using Casette.Api.Infrastructure.Responses;
using Casette.Api.Infrastructure.Services;
using HotChocolate.Authorization;
using HotChocolate.CostAnalysis.Types;

namespace Casette.Api.Infrastructure.Database;

public class Query
{
    [Authorize]
    [UsePaging(MaxPageSize = 20, IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public IQueryable<EntryListResponse> GetEntries(string? searchString, [Service] IUserContext userContext, [Service] CasetteDbContext context)
    {
        var entries = context.Entries.AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchString))
        {
            searchString = searchString.ToLowerInvariant();
            entries = entries.Where(e => e.Tags.Any(x => x.Name.Contains(searchString)));
        }

        return entries
            .Where(x => x.IsVisible && x.Videos.Any(y => y.IsDefault))
            .Select(e => new EntryListResponse
            {
                Id = e.Id,
                Title = e.Title,
                Type = e.Type,
                Popularity = e.Detail.Popularity,
                ReleaseDate = e.Detail.ReleaseDate,
                DurationInSeconds = e.Videos
                    .Where(x => x.IsDefault)
                    .Select(x => x.DurationInSeconds)
                    .FirstOrDefault(),
                PosterPath = e.Detail.PosterPath,
                BackdropPath = e.Detail.BackdropPath,
            })
            .OrderByDescending(x => x.Popularity);
    }

    [Authorize]
    [UsePaging(MaxPageSize = 30, IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public IQueryable<CollectionResponse> GetCollections([Service] CasetteDbContext context)
    {
        return context.Collections
            .Select(c => new CollectionResponse
            {
                Id = c.Id,
                Title = c.Title,
                Entries = c.Entries
                    .OrderBy(e => e.Position)
                    .Select(e => new CollectionEntryResponse
                    {
                        EntryId = e.Entry.Id,
                        Title = e.Entry.Title,
                        Position = e.Position,
                        PosterPath = e.Entry.Detail.PosterPath
                    })
            });
    }

    [Authorize]
    [UsePaging(MaxPageSize = 30, IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    public IQueryable<SeasonResponse> GetSeasons([Service] CasetteDbContext context)
    {
        return context.Seasons
            .Select(s => new SeasonResponse
            {
                Id = s.Id,
                EntryId = s.EntryId,
                Position = s.Position,
                Episodes = s.Episodes.Select(e => new EpisodeResponse
                {
                    Position = e.Position,
                    VideoId = e.VideoId,
                    VideoMarkers = e.Video.Markers.Select(vm => new VideoMarkerResponse
                    {
                        Id = vm.Id,
                        StartInSeconds = vm.StartInSeconds,
                        EndInSeconds = vm.EndInSeconds,
                        Type = vm.Type
                    })
                })
            });
    }

    [Authorize]
    [UsePaging(MaxPageSize = 30, IncludeTotalCount = true)]
    public IQueryable<ProgressResponse> GetProgress([Service] IUserContext userContext, [Service] CasetteDbContext context)
    {
        return context.Progresses
            .Where(p => p.AccountId == userContext.AccountId)
            .OrderByDescending(x => x.Updated)
            .Select(p => new ProgressResponse
            {
                VideoId = p.VideoId,
                EntryId = p.Video.EntryId,
                PosterPath = p.Video.Entry.Detail.PosterPath,
                BackdropPath = p.Video.Entry.Detail.BackdropPath,
                PositionInSeconds = p.PositionInSeconds,
                DurationInSeconds = p.Video.DurationInSeconds
            });
    }

    [Authorize(Policy = AuthPolicy.AdminOnly)]
    [UseFiltering]
    [UseSorting]
    [Cost(0)]
    public IQueryable<AdminEntryResponse> GetAdminEntries(string? searchString, [Service] CasetteDbContext context)
    {
        var entries = context.Entries.AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchString))
        {
            searchString = searchString.ToLowerInvariant();
            entries = entries.Where(e => e.Title.Contains(searchString, StringComparison.CurrentCultureIgnoreCase)
                || e.Tags.Any(t => t.Name.Contains(searchString)));
        }

        return entries
            .Select(e => new AdminEntryResponse
            {
                Id = e.Id,
                Title = e.Title,
                Type = e.Type,
                IsVisible = e.IsVisible,
                PosterPath = e.Detail.PosterPath,
                Tags = e.Tags.Select(t => t.Name),
                VideoCount = e.Videos.Count
            });
    }

    [Authorize(Policy = AuthPolicy.AdminOnly)]
    [UsePaging(MaxPageSize = 20, IncludeTotalCount = true)]
    [UseFiltering]
    [UseSorting]
    [Cost(0)]
    public IQueryable<AdminVideoResponse> GetVideos([Service] CasetteDbContext context)
    {
        return context.Videos
            .Select(v => new AdminVideoResponse
            {
                Id = v.Id,
                EntryId = v.EntryId,
                EntryTitle = v.Entry.Title,
                Filename = v.Filename,
                DurationInSeconds = v.DurationInSeconds,
                IsDefault = v.IsDefault,
                Created = v.Created,
                MarkerCount = v.Markers.Count
            });
    }

    [Authorize(Policy = AuthPolicy.AdminOnly)]
    [UseFiltering]
    [UseSorting]
    public IQueryable<AdminSeasonResponse> GetAdminSeasons([Service] CasetteDbContext context)
    {
        return context.Seasons
            .Select(s => new AdminSeasonResponse
            {
                Id = s.Id,
                EntryId = s.EntryId,
                Position = s.Position,
                Episodes = s.Episodes
                    .Select(e => new AdminEpisodeResponse
                    {
                        VideoId = e.VideoId,
                        Position = e.Position,
                    })
            });
    }

    [Authorize(Policy = AuthPolicy.AdminOnly)]
    [UseFiltering]
    [UseSorting]
    public IQueryable<AdminCollectionResponse> GetAdminCollections([Service] CasetteDbContext context)
    {
        return context.Collections
            .Select(c => new AdminCollectionResponse
            {
                Id = c.Id,
                Title = c.Title,
                Entries = c.Entries
                    .Select(e => new AdminCollectionEntryResponse
                    {
                        EntryId = e.EntryId,
                        Position = e.Position,
                    })
            });
    }
}
