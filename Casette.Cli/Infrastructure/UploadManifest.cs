using System.Text.Json;
using System.Text.Json.Serialization;

namespace Casette.Cli.Infrastructure;

/// <summary>
/// Represents a batch upload manifest file that maps video files to entries.
/// </summary>
public sealed class UploadManifest
{
    /// <summary>
    /// The list of uploads to perform.
    /// </summary>
    [JsonPropertyName("uploads")]
    public List<UploadManifestItem> Uploads { get; init; } = [];

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() }
    };

    /// <summary>
    /// Loads a manifest from a JSON file on disk.
    /// </summary>
    public static UploadManifest Load(string filePath)
    {
        string json = File.ReadAllText(filePath);
        return JsonSerializer.Deserialize<UploadManifest>(json, SerializerOptions)
            ?? throw new InvalidOperationException("Failed to deserialize manifest file.");
    }

    /// <summary>
    /// Saves this manifest to a JSON file on disk.
    /// </summary>
    public void Save(string filePath)
    {
        string json = JsonSerializer.Serialize(this, SerializerOptions);
        File.WriteAllText(filePath, json);
    }

    /// <summary>
    /// Creates a sample manifest for the user as a starting point.
    /// </summary>
    public static UploadManifest CreateSample() => new()
    {
        Uploads =
        [
            new UploadManifestItem
            {
                EntryId = Guid.Empty,
                IsDefault = true,
                Files = ["path/to/movie.mp4"]
            },
            new UploadManifestItem
            {
                EntryId = Guid.Empty,
                IsDefault = false,
                Files = ["path/to/episode01.mp4", "path/to/episode02.mp4", "path/to/episode03.mp4"]
            }
        ]
    };
}

/// <summary>
/// A single entry in the upload manifest — one entry ID with one or more video files.
/// </summary>
public sealed class UploadManifestItem
{
    /// <summary>
    /// The entry ID to upload the video(s) to.
    /// </summary>
    [JsonPropertyName("entryId")]
    public Guid EntryId { get; init; }

    /// <summary>
    /// Whether to mark these videos as the default for the entry.
    /// </summary>
    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; init; }

    /// <summary>
    /// The file paths of videos to upload to this entry.
    /// </summary>
    [JsonPropertyName("files")]
    public List<string> Files { get; init; } = [];
}
