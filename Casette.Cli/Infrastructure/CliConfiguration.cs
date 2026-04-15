using System.Text.Json;

namespace Casette.Cli.Infrastructure;

/// <summary>
/// Manages persistent CLI configuration stored in the user's app data folder.
/// </summary>
public sealed class CliConfiguration
{
    private static readonly string _configDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "casette-cli");
    private static readonly string _configFilePath = Path.Combine(_configDirectory, "config.json");

    public string? BaseUrl { get; set; }
    public string? Token { get; set; }

    /// <summary>
    /// Loads the configuration from disk, or returns a default instance if none exists.
    /// </summary>
    public static CliConfiguration Load()
    {
        if (!File.Exists(_configFilePath))
        {
            return new CliConfiguration();
        }

        try
        {
            string json = File.ReadAllText(_configFilePath);
            return JsonSerializer.Deserialize<CliConfiguration>(json) ?? new CliConfiguration();
        }
        catch
        {
            return new CliConfiguration();
        }
    }

    /// <summary>
    /// Persists the current configuration to disk.
    /// </summary>
    public void Save()
    {
        Directory.CreateDirectory(_configDirectory);
        string json = JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(_configFilePath, json);
    }

    /// <summary>
    /// Returns true if the configuration has a base URL and auth token set.
    /// </summary>
    public bool IsAuthenticated => !string.IsNullOrWhiteSpace(BaseUrl) && !string.IsNullOrWhiteSpace(Token);
}
