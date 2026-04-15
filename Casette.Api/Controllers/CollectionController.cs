using Casette.Api.Infrastructure.Database;
using Casette.Api.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casette.Api.Controllers;

[ApiController, Route("collection"), Authorize(AuthPolicy.AdminOnly)]
public sealed class CollectionController(CasetteDbContext dbContext) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateCollection([FromBody] CollectionCreateRequest request, CancellationToken cancellationToken)
    {
        var collection = new Collection
        {
            Id = Guid.CreateVersion7(),
            Title = request.Title
        };

        await dbContext.Collections.AddAsync(collection, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(collection.Id);
    }

    public sealed class CollectionCreateRequest
    {
        public required string Title { get; init; }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCollection(Guid id, [FromBody] CollectionCreateRequest request, CancellationToken cancellationToken)
    {
        var collection = await dbContext.Collections.FindAsync([id], cancellationToken);

        if (collection is null)
        {
            return NotFound();
        }

        collection.Title = request.Title;

        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCollection(Guid id, CancellationToken cancellationToken)
    {
        var collection = await dbContext.Collections.FindAsync([id], cancellationToken);

        if (collection is null)
        {
            return NotFound();
        }

        dbContext.Collections.Remove(collection);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("{collectionId:guid}/entry")]
    public async Task<IActionResult> CreateCollectionEntry(Guid collectionId, [FromBody] CollectionEntryCreateRequest request, CancellationToken cancellationToken)
    {
        var collection = await dbContext.Collections.FindAsync([collectionId], cancellationToken);
        var entry = await dbContext.Entries.FindAsync([request.EntryId], cancellationToken);

        if (collection is null || entry is null)
        {
            return NotFound();
        }

        var collectionEntry = new CollectionEntry
        {
            CollectionId = collectionId,
            EntryId = request.EntryId,
            Position = request.Position
        };

        await dbContext.CollectionEntries.AddAsync(collectionEntry, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    public sealed class CollectionEntryCreateRequest
    {
        public required int Position { get; init; }
        public required Guid EntryId { get; init; }
    }

    [HttpPut("{collectionId:guid}/entry/{entryId:guid}")]
    public async Task<IActionResult> UpdateCollectionEntry(Guid collectionId, Guid entryId, [FromBody] CollectionEntryUpdateRequest request, CancellationToken cancellationToken)
    {
        var collectionEntry = await dbContext.CollectionEntries.FindAsync([collectionId, entryId], cancellationToken);

        if (collectionEntry is null)
        {
            return NotFound();
        }

        collectionEntry.Position = request.Position;
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    public sealed class CollectionEntryUpdateRequest
    {
        public required int Position { get; init; }
    }

    [HttpDelete("{collectionId:guid}/entry/{entryId:guid}")]
    public async Task<IActionResult> DeleteCollectionEntry(Guid collectionId, Guid entryId, CancellationToken cancellationToken)
    {
        var collectionEntry = await dbContext.CollectionEntries.FindAsync([collectionId, entryId], cancellationToken);

        if (collectionEntry is null)
        {
            return NotFound();
        }

        dbContext.CollectionEntries.Remove(collectionEntry);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
