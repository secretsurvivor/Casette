namespace Casette.Api.Infrastructure.Extensions;

internal static class TagLibExtensions
{
    extension(TagLib.File)
    {
        public static TagLib.File Create(string name, Stream stream)
        {
            return TagLib.File.Create(new StreamFileAbstraction(name, stream));
        }
    }
}

file sealed class StreamFileAbstraction(string name, Stream stream) : TagLib.File.IFileAbstraction
{
    public string Name { get; } = name;
    public Stream ReadStream { get; } = stream;
    public Stream WriteStream { get; } = stream;
    public void CloseStream(Stream stream) { }
}
