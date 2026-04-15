using Casette.Api.Infrastructure.Services;
using Casette.gRPC;
using Grpc.Core;
using Minio;
using Minio.DataModel.Args;
using System.IO.Pipelines;

namespace Casette.Api.Controllers.gRPC;

public sealed class VideoService(IMinioClient minioClient) : Casette.gRPC.VideoService.VideoServiceBase
{
    public override async Task<UploadFileResponse> UploadVideo(IAsyncStreamReader<UploadFileRequest> requestStream, ServerCallContext context)
    {
        if (!await requestStream.MoveNext(context.CancellationToken))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Empty stream"));
        }

        if (requestStream.Current.DataCase != UploadFileRequest.DataOneofCase.Metadata)
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "First message must be metadata"));
        }

        var metadata = requestStream.Current.Metadata;
        string objectName = $"{Guid.NewGuid()}/{metadata.FileName}";

        // Create a pipe to bridge gRPC chunks → MinIO stream
        var pipe = new Pipe(new PipeOptions(
            pauseWriterThreshold: 4 * 1024 * 1024,   // pause writing if MinIO falls 4MB behind
            resumeWriterThreshold: 1 * 1024 * 1024,  // resume once it catches back up to 1MB
            useSynchronizationContext: false
        ));

        // Run writer and MinIO upload concurrently
        var writeTask = WriteChunksToPipeAsync(requestStream, pipe.Writer, context.CancellationToken);
        var uploadTask = UploadFromPipeAsync(pipe.Reader, objectName, metadata, context.CancellationToken);

        await Task.WhenAll(writeTask, uploadTask);

        long bytesReceived = await writeTask;

        return new UploadFileResponse
        {
            ObjectKey = objectName,
            BytesReceived = bytesReceived,
            Success = true
        };
    }

    private static async Task<long> WriteChunksToPipeAsync(
        IAsyncStreamReader<UploadFileRequest> requestStream,
        PipeWriter writer,
        CancellationToken ct)
    {
        long totalBytes = 0;

        try
        {
            await foreach (var message in requestStream.ReadAllAsync(ct))
            {
                if (message.DataCase != UploadFileRequest.DataOneofCase.Chunk)
                {
                    throw new RpcException(new Status(StatusCode.InvalidArgument, "Expected chunk"));
                }

                var chunk = message.Chunk;
                chunk.Memory.CopyTo(writer.GetMemory(chunk.Length));
                writer.Advance(chunk.Length);
                totalBytes += chunk.Length;

                // Flush to unblock MinIO reader if it's waiting
                var result = await writer.FlushAsync(ct);

                if (result.IsCompleted || result.IsCanceled)
                {
                    break;
                }
            }
        }
        catch (Exception ex)
        {
            await writer.CompleteAsync(ex);
            throw;
        }

        await writer.CompleteAsync();
        return totalBytes;
    }

    private async Task UploadFromPipeAsync(
        PipeReader reader,
        string objectName,
        FileMetadata metadata,
        CancellationToken ct)
    {
        try
        {
            await using var pipeStream = reader.AsStream();

            var putArgs = new PutObjectArgs()
                .WithBucket(UploadService._bucketName)
                .WithObject(objectName)
                .WithStreamData(pipeStream)
                .WithObjectSize(metadata.TotalSize)  // -1 if unknown
                .WithContentType(metadata.ContentType);

            await minioClient.PutObjectAsync(putArgs, ct);
        }
        catch (Exception ex)
        {
            await reader.CompleteAsync(ex);
            throw;
        }

        await reader.CompleteAsync();
    }
}
