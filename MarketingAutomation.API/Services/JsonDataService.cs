using System.Text.Json;

namespace MarketingAutomation.API.Services;

public class JsonDataService
{
    private readonly string _dataPath;
    private readonly JsonSerializerOptions _options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    public JsonDataService(IWebHostEnvironment env)
    {
        _dataPath = Path.Combine(env.ContentRootPath, "Data");
        Directory.CreateDirectory(_dataPath);
    }

    public List<T> Load<T>(string fileName)
    {
        var path = Path.Combine(_dataPath, fileName);
        if (!File.Exists(path)) return new List<T>();
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<T>>(json, _options) ?? new List<T>();
    }

    public void Save<T>(string fileName, List<T> data)
    {
        var path = Path.Combine(_dataPath, fileName);
        File.WriteAllText(path, JsonSerializer.Serialize(data, _options));
    }

    public T? LoadSingle<T>(string fileName) where T : new()
    {
        var path = Path.Combine(_dataPath, fileName);
        if (!File.Exists(path)) return new T();
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<T>(json, _options) ?? new T();
    }

    public void SaveSingle<T>(string fileName, T data)
    {
        var path = Path.Combine(_dataPath, fileName);
        File.WriteAllText(path, JsonSerializer.Serialize(data, _options));
    }
}
