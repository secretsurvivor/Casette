using Casette.Cli.Infrastructure;
using Spectre.Console;
using Spectre.Console.Cli;
using System.ComponentModel;

namespace Casette.Cli.Commands;

public sealed class LoginCommand : AsyncCommand<LoginCommand.Settings>
{
    public sealed class Settings : CommandSettings
    {
        [CommandOption("-u|--url <URL>")]
        [Description("The base URL of the Casette API (e.g. https://casette.example.com)")]
        public string? BaseUrl { get; init; }

        [CommandOption("-k|--key <ACCESS_KEY>")]
        [Description("Access key for authentication (will prompt if not provided)")]
        public string? AccessKey { get; init; }

        [CommandOption("-r|--remember")]
        [Description("Generate a long-lived token")]
        [DefaultValue(false)]
        public bool RememberMe { get; init; }
    }

    protected override async Task<int> ExecuteAsync(CommandContext context, Settings settings, CancellationToken cancellationToken)
    {
        AnsiConsole.Write(new FigletText("Casette").Color(Color.Blue));
        AnsiConsole.WriteLine();

        var config = CliConfiguration.Load();

        // Resolve base URL
        string baseUrl = settings.BaseUrl
            ?? config.BaseUrl
            ?? AnsiConsole.Prompt(
                new TextPrompt<string>("Enter the [cyan]API base URL[/]:")
                    .PromptStyle("green")
                    .Validate(url =>
                        Uri.TryCreate(url, UriKind.Absolute, out _)
                            ? ValidationResult.Success()
                            : ValidationResult.Error("[red]Invalid URL format[/]")));

        // Resolve access key
        string accessKey = settings.AccessKey
            ?? AnsiConsole.Prompt(
                new TextPrompt<string>("Enter your [cyan]access key[/]:")
                    .PromptStyle("green")
                    .Secret());

        AnsiConsole.WriteLine();

        // Authenticate
        string? token = null;
        bool success = false;

        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .SpinnerStyle(Style.Parse("blue"))
            .StartAsync("Authenticating...", async ctx => {
                using var client = new ApiClient(baseUrl);
                var result = await client.LoginAsync(accessKey, settings.RememberMe);

                if (result.Success && result.Token is not null)
                {
                    token = result.Token;

                    ctx.Status("Validating session...");
                    ctx.Spinner(Spinner.Known.Star);

                    using var authedClient = new ApiClient(baseUrl, token);
                    success = await authedClient.ValidateTokenAsync();
                }
                else
                {
                    AnsiConsole.MarkupLine($"[red]Login failed:[/] {result.Error ?? "Unknown error"}");
                }
            });

        if (!success || token is null)
        {
            AnsiConsole.MarkupLine("[red]Authentication failed.[/]");
            return 1;
        }

        // Save configuration
        config.BaseUrl = baseUrl;
        config.Token = token;
        config.Save();

        AnsiConsole.WriteLine();

        var panel = new Panel(
            new Rows(
                new Markup($"[green]✓[/] Logged in successfully"),
                new Markup($"[dim]API:[/]   {Markup.Escape(baseUrl)}"),
                new Markup($"[dim]Token:[/] {token[..12]}...")))
            .Header("[bold green] Authenticated [/]")
            .BorderColor(Color.Green)
            .Padding(1, 0);

        AnsiConsole.Write(panel);

        return 0;
    }
}
