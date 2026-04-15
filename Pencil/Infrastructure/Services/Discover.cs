using ForgeSharp.Results;
using Pencil.Infrastructure.Model;
using System.Net;

namespace Pencil.Infrastructure.Services;

internal interface IDiscover
{
    ValueTask<Result<Uri>> ResolveAsync(CancellationToken cancellationToken);
}

internal sealed class MdnsDiscover(HttpClient httpClient, CasetteConfig casetteConfig, IConsole console) : IDiscover
{
    public async ValueTask<Result<Uri>> ResolveAsync(CancellationToken cancellationToken)
    {
        var addresses = await console.StatusAsync("Finding host... ", () => Dns.GetHostAddressesAsync(casetteConfig.BackendHost, cancellationToken));

        if (addresses.Length < 1)
        {
            string inputHost = await console.AskAsync<string>("Failed to find host. Input host: ");

            if (string.IsNullOrWhiteSpace(inputHost))
            {
                console.Print("Failed to find host, cancelling command...");
                return Result.Fail<Uri>("Could not find casette host");
            }

            try
            {
                addresses = [IPAddress.Parse(inputHost)];
            }
            catch
            {
                console.PrintError($"Input '{inputHost}' is an invalid IP Address.");
                return Result.Fail<Uri>("Could not find casette host");
            }
        }

        try
        {
            string url = $"http://{addresses.First()}:{casetteConfig.BackendPort}";
            var uri = new Uri($"{url}/api");

            var response = await httpClient.GetAsync($"{uri}/alive", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                console.PrintError("Casette is not alive, launch Casette to interact with it.");
                return Result.Fail<Uri>("Casette is not active");
            }

            return uri;
        }
        catch
        {
            console.PrintError("Failed to communicate with Casette.");
            return Result.Fail<Uri>("Failed to communicate with casette host");
        }
    }
}
