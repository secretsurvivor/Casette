using Casette.Api.Infrastructure.Configuration;
using Casette.Api.Infrastructure.Database;
using Casette.Api.Infrastructure.Database.Models;
using Casette.Api.Infrastructure.Requests;
using Casette.Api.Infrastructure.Services;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Casette.Api.Controllers;

public static class ClaimConstants
{
    public const string AccountId = "AccountId";
    public const string IsAdmin = "IsAdmin";
}

public static class AuthPolicy
{
    public const string AdminOnly = "AdminOnly";
}

[ApiController, Route("auth")]
public sealed class AuthController(CasetteDbContext dbContext, IOptions<JwtOptions> jwtOptions, ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest loginRequest, CancellationToken cancellationToken)
    {
        var (validAccessKey, keyId, secret) = loginRequest.AccessKey.SplitAccessKey();

        if (!validAccessKey)
        {
            return Unauthorized();
        }

        var account = await dbContext.Accounts.FirstOrDefaultAsync(x => x.KeyId == keyId, cancellationToken);

        byte[] storedSecretHash = Encoding.UTF8.GetBytes(account?.SecretHash ?? new string('0', 64));
        byte[] incomingSecretHash = Encoding.UTF8.GetBytes(secret.HashSecret());

        // Use fixed time comparison to prevent timing attacks
        if (account is null || !CryptographicOperations.FixedTimeEquals(storedSecretHash, incomingSecretHash))
        {
            return Unauthorized();
        }

        return Ok(new { Token = GenerateToken(account, loginRequest.RememberMe, jwtOptions.Value.Secret) });
    }

    public sealed class LoginService(CasetteDbContext dbContext, IOptions<JwtOptions> jwtOptions) : Casette.gRPC.LoginService.LoginServiceBase
    {
        public override async Task<Casette.gRPC.LoginResponse> Login(Casette.gRPC.LoginRequest request, ServerCallContext context)
        {
            var (validAccessKey, keyId, secret) = request.AccessKey.SplitAccessKey();

            if (!validAccessKey)
            {
                return new Casette.gRPC.LoginResponse { Success = false, Token = string.Empty };
            }

            var account = await dbContext.Accounts.FirstOrDefaultAsync(x => x.KeyId == keyId, context.CancellationToken);

            byte[] storedSecretHash = Encoding.UTF8.GetBytes(account?.SecretHash ?? new string('0', 64));
            byte[] incomingSecretHash = Encoding.UTF8.GetBytes(secret.HashSecret());

            // Use fixed time comparison to prevent timing attacks
            if (account is null || !CryptographicOperations.FixedTimeEquals(storedSecretHash, incomingSecretHash))
            {
                return new Casette.gRPC.LoginResponse { Success = false, Token = string.Empty };
            }

            return new Casette.gRPC.LoginResponse { Success = true, Token = GenerateToken(account, extendLife: true, jwtOptions.Value.Secret) };
        }
    }

    [HttpGet("validate"), Authorize]
    public IActionResult ValidateToken()
    {
        // This endpoint is protected by JWT authentication middleware, so if the request reaches here, the token is valid
        return Ok();
    }

    [HttpGet("validate/admin"), Authorize(AuthPolicy.AdminOnly)]
    public IActionResult ValidateAdminToken()
    {
        // This endpoint is protected by JWT authentication middleware, so if the request reaches here, the token is valid
        return Ok();
    }

    [HttpGet("create")]
    public async Task<IActionResult> CreateAccount([FromQuery] bool? admin, CancellationToken cancellationToken)
    {
        // Left wise open until a suitable alternative is available for creating accounts

        var (rawAccessKey, keyId, secretHash) = GenerateAccessKey();
        var newAccount = new Account
        {
            Id = Guid.CreateVersion7(),
            KeyId = keyId,
            SecretHash = secretHash,
            IsAdmin = admin ?? false,
        };

        await dbContext.Accounts.AddAsync(newAccount, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { accessKey = rawAccessKey });
    }

    [HttpGet("verify-stream")]
    public IActionResult VerifyStream([FromServices] IStreamTokenService tokenService)
    {
        // Extract token from the original URI that Nginx forwards
        string uri = Request.Headers["X-Original-URI"].ToString();
        string token = uri.Split('/').Last();
        string? objectKey = tokenService.GetObjectKeyFromToken(token);

        if (objectKey is null)
        {
            return Unauthorized();
        }

        Response.Headers["X-Object-Key"] = objectKey;
        Response.Headers["X-Accel-Redirect"] = $"/casette-videos/{objectKey}";
        return Ok();
    }

    private static string GenerateToken(Account user, bool extendLife, string jwtSecret)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimConstants.AccountId, user.Id.ToString()),
            new Claim(ClaimConstants.IsAdmin, user.IsAdmin.ToString())
        };

        var tokenLifetime = extendLife ? TimeSpan.FromDays(30) : TimeSpan.FromHours(8);
        var token = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.Add(tokenLifetime), signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static (string raw, string keyId, string secretHash) GenerateAccessKey()
    {
        string keyId = Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(8));
        string secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        string secretHash = secret.HashSecret();

        string raw = $"{keyId}.{secret}";

        return (raw, keyId, secretHash);
    }
}

file static class AuthControllerExtensions
{
    public static string HashSecret(this string secret)
    {
        byte[] hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hashBytes);
    }

    public static (bool validAccessKey, string keyId, string secret) SplitAccessKey(this string accessKey)
    {
        string[] parts = accessKey.Split('.', 2);

        if (parts.Length != 2)
        {
            return default;
        }

        return (true, parts[0], parts[1]);
    }
}
