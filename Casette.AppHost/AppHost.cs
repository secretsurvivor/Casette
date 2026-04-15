var builder = DistributedApplication.CreateBuilder(args);

var compose = builder.AddDockerComposeEnvironment("casette")
    .WithDashboard(dashboard => {
        dashboard.WithHostPort(8080).WithForwardedHeaders(enabled: true)
        .WithEnvironment("DASHBOARD__OTLP__GRPC__ENDPOINT", "http://+:18889")
        .WithEnvironment("DASHBOARD__OTLP__HTTP__ENDPOINT", "http://+:18890")
        .WithEnvironment("DASHBOARD__OTLP__CORS__ALLOWEDORIGINS", "https://localhost:8080");
        ;
    });

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume("postgres-database")
    .PublishAsDockerComposeService((resource, service) => {
        service.Name = "postgres";
    })
    .AddDatabase("casette");

var minio = builder.AddMinioContainer("minio")
    .WithDataVolume("minio-blob")
    .PublishAsDockerComposeService((resource, service) => {
        service.Name = "minio";
    });

var jwtSecret = builder.AddParameterFromConfiguration("JwtSecret", "Jwt:Secret", secret: true);
var tmdbApiKey = builder.AddParameterFromConfiguration("TmdbApi", "Tmdb:ApiKey", secret: true);

var api = builder.AddDockerfile("backend", "../", dockerfilePath: "Casette.Api/Dockerfile")
    .WithReference(minio)
    .WithReference(postgres)
    .WithEnvironment("Jwt__Secret", jwtSecret)
    .WithEnvironment("Tmdb__ApiKey", tmdbApiKey)
    .WithOtlpExporter(OtlpProtocol.Grpc)
    .PublishAsDockerComposeService((resource, service) => service.Name = "backend")
    .WaitFor(minio);

var nginx = builder.AddDockerfile("nginx", "../", dockerfilePath: "Casette.Frontend/Dockerfile")
    .WithHttpEndpoint(port: 4200, targetPort: 80)
    .WithReference(minio)
    .PublishAsDockerComposeService((resource, service) => {
        service.Name = "nginx";
        service.Ports = ["80:80", "443:443"];
    })
    .WaitFor(minio)
    .WaitFor(api);

// Add Avahi sidecar for mDNS advertisement
builder.AddContainer("avahi", "flungo/avahi")
    .WithEnvironment("SERVER_HOST_NAME", "casette")  // → casette.local
    .WithEnvironment("SERVER_DOMAIN_NAME", "local")
    .WithBindMount("./avahi-services/casette.service", "/services/casette.service", isReadOnly: true)
    .WithContainerRuntimeArgs("--net=host")
    .WithContainerRuntimeArgs("--cap-add", "NET_ADMIN")
    .WithContainerRuntimeArgs("--cap-add", "NET_BROADCAST");

builder.Build().Run();
