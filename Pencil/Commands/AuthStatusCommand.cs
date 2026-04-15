using Pencil.Infrastructure;
using System.CommandLine;

namespace Pencil.Commands;

internal sealed class AuthStatusCommand : IRegisteredCommand
{
    public static Command RegisterCommand() => throw new NotImplementedException();
    public Task ExecuteAsync(ParseResult result, CancellationToken cancellationToken) => throw new NotImplementedException();
}
