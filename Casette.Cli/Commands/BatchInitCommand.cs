using Casette.Cli.Infrastructure;
using Spectre.Console;
using Spectre.Console.Cli;
using System.ComponentModel;

namespace Casette.Cli.Commands;

public sealed class BatchInitCommand : Command<BatchInitCommand.Settings>
{
    public sealed class Settings : CommandSettings
    {
        [CommandArgument(0, "[OUTPUT]")]
        [Description("Output file path (default: uploads.json)")]
        [DefaultValue("uploads.json")]
        public string OutputPath { get; init; } = "uploads.json";
    }

    protected override int Execute(CommandContext context, Settings settings, CancellationToken cancellationToken)
    {
        if (File.Exists(settings.OutputPath))
        {
            if (!AnsiConsole.Confirm($"[yellow]{Markup.Escape(settings.OutputPath)}[/] already exists. Overwrite?", defaultValue: false))
            {
                AnsiConsole.MarkupLine("[dim]Cancelled.[/]");
                return 0;
            }
        }

        var manifest = UploadManifest.CreateSample();
        manifest.Save(settings.OutputPath);

        AnsiConsole.MarkupLine($"[green]✓[/] Sample manifest written to [cyan]{Markup.Escape(settings.OutputPath)}[/]");
        AnsiConsole.WriteLine();

        AnsiConsole.Write(new Panel(
            new Rows(
                new Markup("[bold]Edit the file to configure your uploads:[/]"),
                new Markup(""),
                new Markup("  [dim]•[/] Set each [cyan]entryId[/] to a real entry GUID"),
                new Markup("  [dim]•[/] Set [cyan]isDefault[/] to mark the video as the default"),
                new Markup("  [dim]•[/] List [cyan]files[/] as absolute or relative paths"),
                new Markup(""),
                new Markup("Then run: [green]casette batch uploads.json[/]")))
            .Header("[bold blue] Next Steps [/]")
            .BorderColor(Color.Blue)
            .Padding(1, 0));

        return 0;
    }
}
