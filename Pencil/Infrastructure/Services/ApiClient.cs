using Casette.gRPC;
using ForgeSharp.Results;
using ForgeSharp.Results.Monad;
using Grpc.Net.Client;

namespace Pencil.Infrastructure.Services;

internal interface IApiClient
{
    Task<Result<string>> LoginAsync(LoginRequest loginRequest, CancellationToken cancellationToken);
    Task<Result<UploadFileResponse>> UploadFileAsync(string filePath, CancellationToken cancellationToken);
}

internal sealed class ApiClient(IDiscover discover, IConsole console) : IApiClient
{
    private static readonly GrpcChannelOptions _options = new GrpcChannelOptions
    {
        HttpHandler = new SocketsHttpHandler
        {
            KeepAlivePingDelay = TimeSpan.FromSeconds(15),
            KeepAlivePingTimeout = TimeSpan.FromSeconds(10),
            KeepAlivePingPolicy = HttpKeepAlivePingPolicy.Always
        }
    };

    private static async Task<Result<GrpcChannel>> CreateGrpcClient(IDiscover discover, CancellationToken cancellationToken)
    {
        return await discover.ResolveAsync(cancellationToken)
            .MapAsync(x => GrpcChannel.ForAddress(x, _options));
    }

    public async Task<Result<string>> LoginAsync(LoginRequest loginRequest, CancellationToken cancellationToken)
    {
        var channelResult = await CreateGrpcClient(discover, cancellationToken);

        if (!channelResult.IsSuccess)
        {
            return channelResult.As<string>();
        }

        using var channel = channelResult.Value;
        var loginService = new LoginService.LoginServiceClient(channel);

        try
        {
            var response = await loginService.LoginAsync(loginRequest, cancellationToken: cancellationToken);

            if (!response.Success)
            {
                return Result.Fail<string>("Failed to login");
            }

            return response.Token;
        }
        catch
        {
            return Result.Fail<string>("Failed to login");
        }
    }

    public Task<Result<UploadFileResponse>> UploadFileAsync(string filePath, CancellationToken cancellationToken) => throw new NotImplementedException();
}
