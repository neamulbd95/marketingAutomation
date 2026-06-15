using MarketingAutomation.API.Models;

namespace MarketingAutomation.API.Services;

public class SettingsService
{
    private readonly JsonDataService _db;
    private const string File = "settings.json";

    public SettingsService(JsonDataService db) => _db = db;

    public AppSettings Get() => _db.LoadSingle<AppSettings>(File) ?? new AppSettings();

    public AppSettings Save(AppSettings settings)
    {
        _db.SaveSingle(File, settings);
        return settings;
    }
}
