using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Casette.Cli.Infrastructure;

/// <summary>
/// Typed HTTP client for communicating with the Casette API.
/// </summary>
public sealed class ApiClient : IDisposable
{
    private readonly HttpClient _httpClient;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiClient(string baseUrl, string? token = null)
    {
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/"),
            Timeout = TimeSpan.FromMinutes(30) // Large timeout for video uploads
        };

        if (!string.IsNullOrWhiteSpace(token))
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    /// <summary>
    /// Authenticates with the API using an access key and returns the JWT token.
    /// </summary>
    public async Task<LoginResult> LoginAsync(string accessKey, bool rememberMe, CancellationToken cancellationToken = default)
    {
        var payload = new { AccessKey = accessKey, RememberMe = rememberMe };
        var response = await _httpClient.PostAsJsonAsync("auth/login", payload, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            string body = await response.Content.ReadAsStringAsync(cancellationToken);
            return new LoginResult(false, null, $"HTTP {(int)response.StatusCode}: {body}");
        }

        var result = await response.Content.ReadFromJsonAsync<LoginResponse>(JsonOptions, cancellationToken);
        return new LoginResult(true, result?.Token, null);
    }

    /// <summary>
    /// Validates the current token against the API.
    /// </summary>
    public async Task<bool> ValidateTokenAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("auth/validate", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Uploads a video file to the API with progress reporting.
    /// </summary>
    public async Task<UploadResult> UploadVideoAsync(
        string filePath,
        Guid entryId,
        bool isDefault,
        IProgress<long>? progress = null,
        CancellationToken cancellationToken = default)
    {
        await using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        HttpContent streamContent = progress is not null
            ? new ProgressStreamContent(fileStream, progress)
            : new StreamContent(fileStream);

        streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

        using var formData = new MultipartFormDataContent();
        formData.Add(streamContent, "file", Path.GetFileName(filePath));
        formData.Add(new StringContent(entryId.ToString()), "EntryId");
        formData.Add(new StringContent(isDefault.ToString()), "IsDefault");

        var response = await _httpClient.PostAsync("video/upload", formData, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            string body = await response.Content.ReadAsStringAsync(cancellationToken);
            return new UploadResult(false, null, $"HTTP {(int)response.StatusCode}: {body}");
        }

        string resultBody = await response.Content.ReadAsStringAsync(cancellationToken);
        // The API returns the video GUID directly as a quoted string
        string videoId = resultBody.Trim('"');
        return new UploadResult(true, videoId, null);
    }

    public void Dispose() => _httpClient.Dispose();
}

public sealed record LoginResult(bool Success, string? Token, string? Error);
public sealed record UploadResult(bool Success, string? VideoId, string? Error);

internal sealed class LoginResponse
{
    public string Token { get; init; } = string.Empty;
}

/// <summary>
/// A StreamContent wrapper that reports upload progress.
/// </summary>
internal sealed class ProgressStreamContent : HttpContent
{
    private readonly Stream _stream;
    private readonly IProgress<long> _progress;
    private const int BufferSize = 81920;

    public ProgressStreamContent(Stream stream, IProgress<long> progress)
    {
        _stream = stream;
        _progress = progress;
    }

    protected override async Task SerializeToStreamAsync(Stream stream, System.Net.TransportContext? context)
    {
        var buffer = new byte[BufferSize];
        long totalBytesRead = 0;
        int bytesRead;

        while ((bytesRead = await _stream.ReadAsync(buffer, CancellationToken.None)) > 0)
        {
            await stream.WriteAsync(buffer.AsMemory(0, bytesRead), CancellationToken.None);
            totalBytesRead += bytesRead;
            _progress.Report(totalBytesRead);
        }
    }

    protected override bool TryComputeLength(out long length)
    {
        length = _stream.Length;
        return true;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _stream.Dispose();
        }

        base.Dispose(disposing);
    }
}
