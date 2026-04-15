using Microsoft.Extensions.DependencyInjection;
using System.CommandLine;

namespace Pencil.Infrastructure;

internal interface IRegisteredCommand
{
    static abstract Command RegisterCommand();
    Task ExecuteAsync(ParseResult result, CancellationToken cancellationToken);
}

internal static class RegisterCommandExtensions
{
    public static Command AddCommand<T>(this Command command, IServiceProvider provider) where T : IRegisteredCommand
    {
        var newCommand = T.RegisterCommand();

        newCommand.SetAction(async (pr, ct) => {
            await using var scope = provider.CreateAsyncScope();
            var action = scope.ServiceProvider.GetRequiredService<T>();
            await action.ExecuteAsync(pr, ct);
        });

        command.Add(newCommand);

        return newCommand;
    }
}
