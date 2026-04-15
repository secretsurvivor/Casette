using Casette.Cli.Infrastructure;
using Spectre.Console;
using Spectre.Console.Cli;
using System.ComponentModel;

namespace Casette.Cli.Commands;

public sealed class BatchUploadCommand : AsyncCommand<BatchUploadCommand.Settings>
{
    public sealed class Settings : CommandSettings
    {
        [CommandArgument(0, "<MANIFEST>")]
        [Description("Path to a JSON manifest file describing the uploads")]
        public string ManifestPath { get; init; } = string.Empty;

        public override ValidationResult Validate()
        {
            if (!File.Exists(ManifestPath))
            {
                return ValidationResult.Error($"Manifest file not found: [red]{Markup.Escape(ManifestPath)}[/]");
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

        // Load manifest
        UploadManifest manifest;
        try
        {
            manifest = UploadManifest.Load(settings.ManifestPath);
        }
        catch (Exception ex)
        {
            AnsiConsole.MarkupLine($"[red]Failed to parse manifest:[/] {Markup.Escape(ex.Message)}");
            return 1;
        }

        if (manifest.Uploads.Count == 0)
        {
            AnsiConsole.MarkupLine("[yellow]Manifest contains no uploads.[/]");
            return 0;
        }

        // Validate all files exist before starting
        var errors = new List<string>();
        foreach (var item in manifest.Uploads)
        {
            if (item.EntryId == Guid.Empty)
            {
                errors.Add($"Entry has an empty GUID — update the manifest with a real entry ID.");
            }

            foreach (string file in item.Files)
            {
                if (!File.Exists(file))
                {
                    errors.Add($"File not found: {file}");
                }
            }

            if (item.Files.Count == 0)
            {
                errors.Add($"Entry [cyan]{item.EntryId}[/] has no files listed.");
            }
        }

        if (errors.Count > 0)
        {
            AnsiConsole.MarkupLine("[red]Manifest validation failed:[/]");
            foreach (string error in errors)
            {
                AnsiConsole.MarkupLine($"  [red]•[/] {Markup.Escape(error)}");
            }

            return 1;
        }

        int totalFiles = manifest.Uploads.Sum(u => u.Files.Count);
        long totalBytes = manifest.Uploads
            .SelectMany(u => u.Files)
            .Sum(f => new FileInfo(f).Length);

        // Show batch plan as a tree
        var tree = new Tree("[bold blue]Batch Upload Plan[/]");

        foreach (var item in manifest.Uploads)
        {
            var entryNode = tree.AddNode($"[cyan]{item.EntryId}[/] [dim](default: {item.IsDefault})[/]");

            foreach (string file in item.Files)
            {
                var fileInfo = new FileInfo(file);
                entryNode.AddNode($"{Markup.Escape(fileInfo.Name)} [dim]({FormatFileSize(fileInfo.Length)})[/]");
            }
        }

        AnsiConsole.Write(new Panel(tree)
            .Header("[bold blue] Manifest [/]")
            .BorderColor(Color.Blue)
            .Padding(1, 0));
        AnsiConsole.WriteLine();

        // Summary
        var summaryTable = new Table()
            .Border(TableBorder.Rounded)
            .AddColumn("[bold]Metric[/]")
            .AddColumn("[bold]Value[/]");

        summaryTable.AddRow("Entries", $"[cyan]{manifest.Uploads.Count}[/]");
        summaryTable.AddRow("Total Files", $"[cyan]{totalFiles}[/]");
        summaryTable.AddRow("Total Size", $"[cyan]{FormatFileSize(totalBytes)}[/]");
        summaryTable.AddRow("API", $"[dim]{config.BaseUrl}[/]");

        AnsiConsole.Write(summaryTable);
        AnsiConsole.WriteLine();

        if (!AnsiConsole.Confirm($"Upload [cyan]{totalFiles}[/] file(s) across [cyan]{manifest.Uploads.Count}[/] entry/entries?"))
        {
            AnsiConsole.MarkupLine("[yellow]Batch upload cancelled.[/]");
            return 0;
        }

        AnsiConsole.WriteLine();

        using var client = new ApiClient(config.BaseUrl!, config.Token);

        // Validate token
        bool tokenValid = await AnsiConsole.Status()
            .Spinner(Spinner.Known.Dots)
            .SpinnerStyle(Style.Parse("blue"))
            .StartAsync("Validating token...", async _ => await client.ValidateTokenAsync());

        if (!tokenValid)
        {
            AnsiConsole.MarkupLine("[red]Token is invalid or expired.[/] Run [yellow]casette login[/] to re-authenticate.");
            return 1;
        }

        // Upload everything with progress
        var results = new List<(string File, Guid EntryId, bool Success, string? VideoId, string? Error)>();

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
                // Build a flat list of (entry, file, progressTask) so we can show all at once
                var allJobs = new List<(UploadManifestItem Item, string File, FileInfo FileInfo, ProgressTask Task)>();

                foreach (var item in manifest.Uploads)
                {
                    foreach (string file in item.Files)
                    {
                        var fileInfo = new FileInfo(file);
                        string shortEntryId = item.EntryId.ToString()[..8];
                        var task = ctx.AddTask(
                            $"[dim]{shortEntryId}[/] [bold]{Markup.Escape(fileInfo.Name)}[/]",
                            maxValue: fileInfo.Length);
                        allJobs.Add((item, file, fileInfo, task));
                    }
                }

                // Upload sequentially
                foreach (var (item, file, fileInfo, task) in allJobs)
                {
                    var progress = new Progress<long>(bytesRead => {
                        task.Value = bytesRead;
                    });

                    try
                    {
                        var result = await client.UploadVideoAsync(
                            file, item.EntryId, item.IsDefault, progress);

                        if (result.Success)
                        {
                            task.Value = task.MaxValue;
                            task.Description = $"[green]{Markup.Escape(fileInfo.Name)}[/]";
                            results.Add((fileInfo.Name, item.EntryId, true, result.VideoId, null));
                        }
                        else
                        {
                            task.Description = $"[red]{Markup.Escape(fileInfo.Name)}[/]";
                            results.Add((fileInfo.Name, item.EntryId, false, null, result.Error));
                        }
                    }
                    catch (Exception ex)
                    {
                        task.Description = $"[red]{Markup.Escape(fileInfo.Name)}[/]";
                        results.Add((fileInfo.Name, item.EntryId, false, null, ex.Message));
                    }
                }
            });

        AnsiConsole.WriteLine();

        // Results table grouped by entry
        int successCount = results.Count(r => r.Success);
        int failCount = results.Count(r => !r.Success);

        var resultsTable = new Table()
            .Border(TableBorder.Rounded)
            .AddColumn("Status")
            .AddColumn("Entry ID")
            .AddColumn("Filename")
            .AddColumn("Video ID");

        foreach (var group in results.GroupBy(r => r.EntryId))
        {
            bool first = true;
            foreach (var (file, entryId, success, videoId, error) in group)
            {
                string entryCol = first ? $"[cyan]{entryId.ToString()[..8]}...[/]" : "";
                first = false;

                if (success)
                {
                    resultsTable.AddRow(
                        "[green]✓[/]",
                        entryCol,
                        Markup.Escape(file),
                        $"[dim]{videoId}[/]");
                }
                else
                {
                    resultsTable.AddRow(
                        "[red]✗[/]",
                        entryCol,
                        Markup.Escape(file),
                        $"[red]{Markup.Escape(error ?? "Unknown error")}[/]");
                }
            }

            resultsTable.AddEmptyRow();
        }

        AnsiConsole.Write(new Panel(resultsTable)
            .Header("[bold] Results [/]")
            .BorderColor(failCount > 0 ? Color.Yellow : Color.Green));

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
