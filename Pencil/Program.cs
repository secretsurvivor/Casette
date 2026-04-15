using Microsoft.Extensions.DependencyInjection;
using Pencil.Commands;
using Pencil.Infrastructure;
using Pencil.Infrastructure.Services;
using System.CommandLine;

var serviceCollection = new ServiceCollection();

serviceCollection.AddSingleton(_ => new EnvironmentPaths
{
    Directory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "pencil"),
    Filename = "config.bin",
});
serviceCollection.AddTransient<IEnvironmentStore, EnvironmentStore>();
serviceCollection.AddSingleton<IKeyVault, KeyVault>();
serviceCollection.AddTransient<IDiscover, MdnsDiscover>();

serviceCollection.AddTransient<AuthCommand>();
serviceCollection.AddTransient<AuthStatusCommand>();
serviceCollection.AddTransient<AuthClearCommand>();
serviceCollection.AddTransient<UploadCommand>();

await using var serviceProvider = serviceCollection.BuildServiceProvider();

var root = new RootCommand("Pencil - the CLI tool for Casette");

var authCommand = root.AddCommand<AuthCommand>(serviceProvider);
authCommand.AddCommand<AuthStatusCommand>(serviceProvider);
authCommand.AddCommand<AuthClearCommand>(serviceProvider);

root.AddCommand<UploadCommand>(serviceProvider);

var parseResult = root.Parse(args);

await parseResult.InvokeAsync();
