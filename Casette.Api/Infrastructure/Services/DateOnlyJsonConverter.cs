using System.Text.Json;
using System.Text.Json.Serialization;

namespace Casette.Api.Infrastructure.Services;

public static class JsonOptions
{
    private static readonly JsonSerializerOptions _default = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new DateOnlyJsonConverter() }
    };

    public static JsonSerializerOptions Default => _default;
}

public class DateOnlyJsonConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        string? value = reader.GetString();

        if (string.IsNullOrEmpty(value))
        {
            return default;
        }

        return DateOnly.Parse(value);
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options) => writer.WriteStringValue(value.ToString("yyyy-MM-dd"));
}
