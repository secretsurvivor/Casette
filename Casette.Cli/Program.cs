using Casette.Cli.Commands;
using Spectre.Console;
using Spectre.Console.Cli;

namespace Casette.Cli;

internal class Program
{
    static async Task<int> Main(string[] args)
    {
        var app = new CommandApp();

        app.Configure(config =>
        {
            config.SetApplicationName("casette");
            config.SetApplicationVersion("1.0.0");

            config.AddCommand<LoginCommand>("login")
                .WithDescription("Authenticate with the Casette API")
                .WithExample("login")
                .WithExample("login", "--url", "https://casette.example.com")
                .WithExample("login", "--url", "https://casette.example.com", "--key", "mykey", "--remember");

            config.AddCommand<UploadCommand>("upload")
                .WithDescription("Upload one or more video files to an entry")
                .WithExample("upload", "550e8400-e29b-41d4-a716-446655440000", "video.mp4")
                .WithExample("upload", "550e8400-e29b-41d4-a716-446655440000", "ep01.mp4", "ep02.mp4", "ep03.mp4")
                .WithExample("upload", "550e8400-e29b-41d4-a716-446655440000", "movie.mkv", "--default");

            config.AddCommand<ConfigCommand>("config")
                .WithDescription("View or modify CLI configuration")
                .WithExample("config")
                .WithExample("config", "--url", "https://casette.example.com")
                .WithExample("config", "--clear");

            config.AddBranch("batch", batch =>
            {
                batch.SetDescription("Batch upload videos from a JSON manifest file");

                batch.AddCommand<BatchUploadCommand>("run")
                    .WithDescription("Execute uploads defined in a manifest file")
                    .WithExample("batch", "run", "uploads.json");

                batch.AddCommand<BatchInitCommand>("init")
                    .WithDescription("Generate a sample manifest file to get started")
                    .WithExample("batch", "init")
                    .WithExample("batch", "init", "my-uploads.json");
            });

            config.AddCommand<StatusCommand>("status")
                .WithDescription("Check API connection and authentication status")
                .WithExample("status");
        });

        try
        {
            return await app.RunAsync(args);
        }
        catch (Exception ex)
        {
            AnsiConsole.WriteException(ex, ExceptionFormats.ShortenEverything);
            return 1;
        }
    }
}
