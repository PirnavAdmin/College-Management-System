using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Helpers
{
    public class DateOnlyJsonConverter : JsonConverter<DateOnly>
    {
        private readonly string[] _formats = { "yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy", "yyyy/MM/dd" };

        public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetString();
            if (string.IsNullOrWhiteSpace(value))
            {
                return default;
            }

            foreach (var format in _formats)
            {
                if (DateOnly.TryParseExact(value, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                {
                    return date;
                }
            }

            throw new JsonException($"Unable to parse \"{value}\" as a date. Supported formats: {string.Join(", ", _formats)}");
        }

        public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        }
    }
}
