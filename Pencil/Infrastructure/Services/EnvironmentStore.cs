using Pencil.Infrastructure.Model;

namespace Pencil.Infrastructure.Services;

internal interface IEnvironmentStore
{
    PencilEnvironment LoadConfig();
    void SaveConfig(PencilEnvironment config);
    void ClearConfig();
}

internal sealed class EnvironmentPaths
{
    public required string Directory { get; init; }
    public required string Filename { get; init; }
    public string Filepath => Path.Combine(Directory, Filename);
}

internal sealed class EnvironmentStore(EnvironmentPaths paths) : IEnvironmentStore
{
    public PencilEnvironment LoadConfig()
    {
        if (!File.Exists(paths.Filepath))
        {
            return new PencilEnvironment();
        }

        using var fileStream = File.OpenRead(paths.Filepath);
        return ProtoBuf.Serializer.Deserialize<PencilEnvironment>(fileStream);
    }

    public void SaveConfig(PencilEnvironment config)
    {
        if (!Directory.Exists(paths.Directory))
        {
            Directory.CreateDirectory(paths.Directory);
        }

        using var fileStream = File.Create(paths.Filepath);
        ProtoBuf.Serializer.Serialize(fileStream, config);
    }

    public void ClearConfig()
    {
        if (File.Exists(paths.Filepath))
        {
            File.Delete(paths.Filepath);
        }
    }
}
