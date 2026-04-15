using Casette.Api.Controllers;
using Casette.Api.Controllers.gRPC;
using Casette.Api.Infrastructure.Configuration;
using Casette.Api.Infrastructure.Database;
using Casette.Api.Infrastructure.Services;
using Casette.ServiceDefaults;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Minio;
using Polly;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Casette.Api;

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services
            .AddOptions<JwtOptions>()
            .BindConfiguration("Jwt")
            .Validate(x => !string.IsNullOrEmpty(x.Secret), "JWT secret is required")
            .ValidateOnStart();

        builder.Services
            .AddOptions<TmdbOptions>()
            .BindConfiguration("Tmdb")
            .Validate(x => !string.IsNullOrEmpty(x.ApiKey), "TMDB API key is required")
            .ValidateOnStart();

        builder.AddServiceDefaults();

        // Add services to the container.
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddControllers();
        builder.Services.AddCors();
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();
        builder.Services.AddDbContext<CasetteDbContext>(options => {
            string? connectionString = builder.Configuration.GetConnectionString("casette");
            options.UseNpgsql(connectionString);
        });

        builder.Services.AddGrpc(options => {
            options.EnableDetailedErrors = builder.Environment.IsDevelopment();
            options.MaxReceiveMessageSize = 2 * 1024 * 1024; // 2MB
        });

        builder.Services.AddAuthorizationBuilder()
            .AddPolicy(AuthPolicy.AdminOnly, policy => policy.RequireClaim(ClaimConstants.IsAdmin, bool.TrueString));
        builder.Services.AddAuthentication("Bearer")
            .AddJwtBearer("Bearer", options => {
                var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        System.Text.Encoding.UTF8.GetBytes(jwt.Secret)
                    ),
                };
            });

        builder.Services.AddMinio(options => {
            string connectionString = builder.Configuration.GetConnectionString("minio")!;
            var parts = connectionString
                .Split(';')
                .Select(p => p.Split('=', 2))
                .ToDictionary(p => p[0], p => p[1]);

            var endpoint = new Uri(parts["Endpoint"]);
            options.WithEndpoint(endpoint.Host, endpoint.Port)
                .WithCredentials(parts["AccessKey"], parts["SecretKey"])
                .WithSSL(endpoint.Scheme == "https");
        });

        builder.Services
            .AddGraphQLServer()
            .AddAuthorization()
            .ModifyRequestOptions(o => o.IncludeExceptionDetails = builder.Environment.IsDevelopment())
            .ModifyCostOptions(x => x.EnforceCostLimits = false)
            .AddQueryType<Query>()
            .AddFiltering()
            .AddSorting();

        builder.Services
            .AddHttpClient<ITmdbClient, TmdbClient>(client => {
                var tmdbConfig = builder.Configuration.GetSection("Tmdb").Get<TmdbOptions>()!;
                client.BaseAddress = new Uri("https://api.themoviedb.org/3/");
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tmdbConfig.ApiKey);
            })
            .AddResilienceHandler("tmdb", pipeline => {
                // Retry on 429 and 5xx with exponential backoff
                pipeline.AddRetry(new HttpRetryStrategyOptions
                {
                    MaxRetryAttempts = 3,
                    Delay = TimeSpan.FromSeconds(2),
                    BackoffType = DelayBackoffType.Exponential,
                    ShouldHandle = args => args.Outcome switch {
                        { Result.StatusCode: HttpStatusCode.TooManyRequests } => PredicateResult.True(),
                        { Result.StatusCode: HttpStatusCode.ServiceUnavailable } => PredicateResult.True(),
                        _ => PredicateResult.False()
                    }
                });

                // Timeout per request
                pipeline.AddTimeout(TimeSpan.FromSeconds(10));
            });

        builder.Services.ConfigureHttpJsonOptions(options => {
            options.SerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        });

        builder.Services.Configure<JsonSerializerOptions>("http", options => {
            options.PropertyNameCaseInsensitive = true;
            options.Converters.Add(new DateOnlyJsonConverter());
        });

        builder.Services.Configure<ForwardedHeadersOptions>(options => {
            options.KnownProxies.Add(IPAddress.Loopback);
        });

        builder.Services
            .AddSingleton<IStreamTokenService, StreamTokenService>()
            .AddScoped<IUserContext, UserContext>()
            .AddTransient<IUploadService, UploadService>();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        app.MapGrpcService<AuthController.LoginService>();
        app.MapGrpcService<VideoService>();

        app.UseForwardedHeaders(new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
        });

        app.UseCors(policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapDefaultEndpoints();
        app.MapControllers();

        app.MapGraphQL("/graphql");

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CasetteDbContext>();
            await db.Database.EnsureCreatedAsync();

            var uploadService = scope.ServiceProvider.GetRequiredService<IUploadService>();
            await uploadService.EnsureBucketAsync();
        }

        app.Run();
    }
}
