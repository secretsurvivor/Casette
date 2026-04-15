using Casette.Cli.Infrastructure;
using Spectre.Console;
using Spectre.Console.Cli;
using System.ComponentModel;

namespace Casette.Cli.Commands;

public sealed class UploadCommand : AsyncCommand<UploadCommand.Settings>
{
    public sealed class Settings : CommandSettings
    {
        [CommandArgument(0, "<ENTRY_ID>")]
        [Description("The entry ID (GUID) to upload the video(s) to")]
        public string EntryId { get; init; } = string.Empty;

        [CommandArgument(1, "<FILES>")]
        [Description("One or more video file paths to upload")]
        public string[] Files { get; init; } = [];

        [CommandOption("-d|--default")]
        [Description("Mark the uploaded video(s) as default")]
        [DefaultValue(false)]
        public bool IsDefault { get; init; }

        public override ValidationResult Validate()
        {
            if (!Guid.TryParse(EntryId, out _))
            {
                return ValidationResult.Error("Entry ID must be a valid GUID.");
            }

            if (Files.Length == 0)
            {
                return ValidationResult.Error("At least one file path is required.");
            }

            foreach (string file in Files)
            {
                if (!File.Exists(file))
                {
                    return ValidationResult.Error($"File not found: [red]{file}[/]");
                }
            }

            return ValidationResult.Success();
        }
    }

    protected override async Task<int> ExecuteAsync(CommandContext context, Settings settings, CancellationToken cancellationToken)
    {
        var config = CliConfiguration.Load();

        if (!config.IsAuthenticated)
        {
            AnsiConsole.MarkupLine("[red]Not authenticated.[/] Run [yellow]casette login[/] first.");
            return 1;
        }

        var entryId = Guid.Parse(settings.EntryId);
        string[] files = settings.Files;

        // Show upload plan
        var infoTable = new Table()
            .Border(TableBorder.Rounded)
            .AddColumn("[bold]Property[/]")
            .AddColumn("[bold]Value[/]");

        infoTable.AddRow("Entry ID", $"[cyan]{entryId}[/]");
        infoTable.AddRow("Files", $"[cyan]{files.Length}[/]");
        infoTable.AddRow("Set as Default", settings.IsDefault ? "[green]Yes[/]" : "[grey]No[/]");
        infoTable.AddRow("API", $"[dim]{config.BaseUrl}[/]");

        AnsiConsole.Write(new Panel(infoTable)
            .Header("[bold blue] Upload Plan [/]")
            .BorderColor(Color.Blue));
        AnsiConsole.WriteLine();

        // File details table
        var filesTable = new Table()
            .Border(TableBorder.Simple)
            .AddColumn("#")
            .AddColumn("Filename")
            .AddColumn("Size", c => c.RightAligned());

        for (int i = 0; i < files.Length; i++)
        {
            var fileInfo = new FileInfo(files[i]);
            filesTable.AddRow(
                $"[dim]{i + 1}[/]",
                Markup.Escape(fileInfo.Name),
                FormatFileSize(fileInfo.Length));
        }

        AnsiConsole.Write(filesTable);
        AnsiConsole.WriteLine();

        // Confirm
        if (!AnsiConsole.Confirm($"Upload [cyan]{files.Length}[/] file(s)?"))
        {
            AnsiConsole.MarkupLine("[yellow]Upload cancelled.[/]");
            return 0;
        }

        AnsiConsole.WriteLine();

        using var client = new ApiClient(config.BaseUrl!, config.Token);

        // Validate token first
        bool tokenValid = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .SpinnerStyle(Style.Parse("blue"))
            .StartAsync("Validating token...", async _ => await client.ValidateTokenAsync());

        if (!tokenValid)
        {
            AnsiConsole.MarkupLine("[red]Token is invalid or expired.[/] Run [yellow]casette login[/] to re-authenticate.");
            return 1;
        }

        // Upload with progress
        var results = new List<(string File, bool Success, string? VideoId, string? Error)>();

        await AnsiConsole.Progress()
            .AutoRefresh(true)
            .AutoClear(false)
            .HideCompleted(false)
            .Columns(
                new TaskDescriptionColumn(),
                new ProgressBarColumn(),
                new PercentageColumn(),
                new TransferSpeedColumn(),
                new RemainingTimeColumn(),
                new SpinnerColumn(Spinner.Known.Dots))
            .StartAsync(async ctx => {
                // Create all tasks up front
                var uploadTasks = files.Select(file => {
                    var fileInfo = new FileInfo(file);
                    var task = ctx.AddTask($"[bold]{Markup.Escape(fileInfo.Name)}[/]", maxValue: fileInfo.Length);
                    return (File: file, FileInfo: fileInfo, Task: task);
                }).ToList();

                // Upload sequentially (API processes one at a time)
                foreach (var (file, fileInfo, task) in uploadTasks)
                {
                    var progress = new Progress<long>(bytesRead => {
                        task.Value = bytesRead;
                    });

                    try
                    {
                        var result = await client.UploadVideoAsync(
                            file, entryId, settings.IsDefault, progress);

                        if (result.Success)
                        {
                            task.Value = task.MaxValue;
                            task.Description = $"[green]{Markup.Escape(fileInfo.Name)}[/]";
                            results.Add((fileInfo.Name, true, result.VideoId, null));
                        }
                        else
                        {
                            task.Description = $"[red]{Markup.Escape(fileInfo.Name)}[/]";
                            results.Add((fileInfo.Name, false, null, result.Error));
                        }
                    }
                    catch (Exception ex)
                    {
                        task.Description = $"[red]{Markup.Escape(fileInfo.Name)}[/]";
                        results.Add((fileInfo.Name, false, null, ex.Message));
                    }
                }
            });

        AnsiConsole.WriteLine();

        // Results summary
        int successCount = results.Count(r => r.Success);
        int failCount = results.Count(r => !r.Success);

        var resultsTable = new Table()
            .Border(TableBorder.Rounded)
            .AddColumn("Status")
            .AddColumn("Filename")
            .AddColumn("Video ID");

        foreach (var (file, success, videoId, error) in results)
        {
            if (success)
            {
                resultsTable.AddRow(
                    "[green]✓[/]",
                    Markup.Escape(file),
                    $"[dim]{videoId}[/]");
            }
            else
            {
                resultsTable.AddRow(
                    "[red]✗[/]",
                    Markup.Escape(file),
                    $"[red]{Markup.Escape(error ?? "Unknown error")}[/]");
            }
        }

        AnsiConsole.Write(new Panel(resultsTable)
            .Header("[bold] Results [/]")
            .BorderColor(failCount > 0 ? Color.Yellow : Color.Green));

        // Summary rule
        if (failCount == 0)
        {
            AnsiConsole.Write(new Rule($"[green]All {successCount} file(s) uploaded successfully[/]").RuleStyle("green"));
        }
        else
        {
            AnsiConsole.Write(new Rule($"[yellow]{successCount} succeeded, {failCount} failed[/]").RuleStyle("yellow"));
        }

        return failCount > 0 ? 1 : 0;
    }

    private static string FormatFileSize(long bytes) => bytes switch
    {
        < 1024 => $"{bytes} B",
        < 1024 * 1024 => $"{bytes / 1024.0:F1} KB",
        < 1024 * 1024 * 1024 => $"{bytes / (1024.0 * 1024.0):F1} MB",
        _ => $"{bytes / (1024.0 * 1024.0 * 1024.0):F2} GB"
    };
}
