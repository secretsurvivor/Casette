using Pencil.Infrastructure;
using Pencil.Infrastructure.Services;
using System.CommandLine;

namespace Pencil.Commands;

internal sealed class AuthCommand(IEnvironmentStore environmentStore) : IRegisteredCommand
{
    private static readonly Argument<string> _accessKeyArgument = new Argument<string>("accessKey")
    {
        Description = "The access key to authenticate with",
        Arity = ArgumentArity.ExactlyOne
    };

    public static Command RegisterCommand()
    {
        var command = new Command("auth", "Set authentication");
        command.Arguments.Add(_accessKeyArgument);

        return command;
    }

    public async Task ExecuteAsync(ParseResult result, CancellationToken cancellationToken)
    {
        string accessKey = result.GetRequiredValue(_accessKeyArgument);

        environmentStore.SaveConfig(new Infrastructure.Model.PencilEnvironment
        {
            JwtToken = accessKey,
        });
    }
}
