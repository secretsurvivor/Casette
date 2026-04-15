using Minio;
using Minio.DataModel.Args;

namespace Casette.Api.Infrastructure.Services;

public interface IUploadService
{
    Task EnsureBucketAsync();
    Task<string> UploadAsync(Stream stream, long size, CancellationToken cancellationToken);
    Task DeleteAsync(string objectKey, CancellationToken cancellationToken);
}

public sealed class UploadService(IMinioClient minioClient) : IUploadService
{
    public const string _bucketName = "casette-videos";

    public async Task EnsureBucketAsync()
    {
        bool exists = await minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(_bucketName));

        if (!exists)
        {
            await minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(_bucketName));
        }

        await minioClient.SetPolicyAsync(new SetPolicyArgs()
             .WithBucket(_bucketName)
             .WithPolicy("""
             {
                 "Version": "2012-10-17",
                 "Statement": [{
                     "Effect": "Allow",
                     "Principal": "*",
                     "Action": "s3:GetObject",
                     "Resource": "arn:aws:s3:::casette-videos/*"
                 }]
             }
             """));
    }

    public async Task<string> UploadAsync(Stream stream, long size, CancellationToken cancellationToken)
    {
        string objectKey = Guid.CreateVersion7().ToString();
        var args = new PutObjectArgs()
            .WithBucket(_bucketName)
            .WithObject(objectKey)
            .WithStreamData(stream)
            .WithObjectSize(size);

        await minioClient.PutObjectAsync(args, cancellationToken);
        return objectKey;
    }

    public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken)
    {
        var args = new RemoveObjectArgs()
            .WithBucket(_bucketName)
            .WithObject(objectKey);

        await minioClient.RemoveObjectAsync(args, cancellationToken);
    }
}
