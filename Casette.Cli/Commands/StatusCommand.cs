using Casette.Cli.Infrastructure;
using Spectre.Console;
using Spectre.Console.Cli;

namespace Casette.Cli.Commands;

public sealed class StatusCommand : AsyncCommand
{
    protected override async Task<int> ExecuteAsync(CommandContext context, CancellationToken cancellationToken)
    {
        var config = CliConfiguration.Load();

        AnsiConsole.Write(new Rule("[bold blue]Connection Status[/]").RuleStyle("blue"));
        AnsiConsole.WriteLine();

        if (!config.IsAuthenticated)
        {
            AnsiConsole.MarkupLine("[yellow]Not configured.[/] Run [cyan]casette login[/] to get started.");
            return 1;
        }

        var table = new Table()
            .Border(TableBorder.Rounded)
            .AddColumn("[bold]Check[/]")
            .AddColumn("[bold]Result[/]");

        table.AddRow("API URL", $"[cyan]{Markup.Escape(config.BaseUrl!)}[/]");

        bool tokenValid = false;

        await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .SpinnerStyle(Style.Parse("blue"))
            .StartAsync("Checking connection...", async _ => {
                using var client = new ApiClient(config.BaseUrl!, config.Token);
                tokenValid = await client.ValidateTokenAsync();
            });

        table.AddRow("Token", tokenValid ? "[green]Valid ✓[/]" : "[red]Invalid ✗[/]");
        table.AddRow("Connection", tokenValid ? "[green]Connected[/]" : "[red]Failed[/]");

        AnsiConsole.Write(table);

        if (!tokenValid)
        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[yellow]Token may be expired. Run [cyan]casette login[/] to re-authenticate.[/]");
        }

        return tokenValid ? 0 : 1;
    }
}
