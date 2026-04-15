using Casette.Cli.Infrastructure;
using Spectre.Console;
using Spectre.Console.Cli;
using System.ComponentModel;

namespace Casette.Cli.Commands;

public sealed class ConfigCommand : Command<ConfigCommand.Settings>
{
    public sealed class Settings : CommandSettings
    {
        [CommandOption("-u|--url <URL>")]
        [Description("Set the API base URL")]
        public string? BaseUrl { get; init; }

        [CommandOption("--clear")]
        [Description("Clear all stored configuration and credentials")]
        [DefaultValue(false)]
        public bool Clear { get; init; }
    }

    protected override int Execute(CommandContext context, Settings settings, CancellationToken cancellationToken)
    {
        var config = CliConfiguration.Load();

        if (settings.Clear)
        {
            config.BaseUrl = null;
            config.Token = null;
            config.Save();
            AnsiConsole.MarkupLine("[green]✓[/] Configuration cleared.");
            return 0;
        }

        if (settings.BaseUrl is not null)
        {
            if (!Uri.TryCreate(settings.BaseUrl, UriKind.Absolute, out _))
            {
                AnsiConsole.MarkupLine("[red]Invalid URL format.[/]");
                return 1;
            }

            config.BaseUrl = settings.BaseUrl;
            config.Save();
            AnsiConsole.MarkupLine($"[green]✓[/] API URL set to [cyan]{Markup.Escape(settings.BaseUrl)}[/]");
            return 0;
        }

        // Display current config
        AnsiConsole.Write(new Rule("[bold blue]Configuration[/]").RuleStyle("blue"));
        AnsiConsole.WriteLine();

        var table = new Table()
            .Border(TableBorder.Rounded)
            .AddColumn("[bold]Setting[/]")
            .AddColumn("[bold]Value[/]");

        table.AddRow(
            "API URL",
            config.BaseUrl is not null
                ? $"[cyan]{Markup.Escape(config.BaseUrl)}[/]"
                : "[dim]Not set[/]");

        table.AddRow(
            "Auth Token",
            config.Token is not null
                ? $"[green]{config.Token[..Math.Min(16, config.Token.Length)]}...[/]"
                : "[dim]Not set[/]");

        table.AddRow(
            "Status",
            config.IsAuthenticated
                ? "[green]Authenticated[/]"
                : "[yellow]Not authenticated[/]");

        AnsiConsole.Write(table);

        return 0;
    }
}
