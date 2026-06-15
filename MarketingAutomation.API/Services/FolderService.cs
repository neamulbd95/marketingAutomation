using MarketingAutomation.API.Models;

namespace MarketingAutomation.API.Services;

public class FolderService
{
    private readonly JsonDataService _db;
    private const string CampaignFile = "campaign_folders.json";
    private const string SegmentFile = "segment_folders.json";

    public FolderService(JsonDataService db) => _db = db;

    public List<CampaignFolder> GetCampaignFolders() =>
        _db.Load<CampaignFolder>(CampaignFile).Where(f => !f.IsDelete).OrderBy(f => f.Name).ToList();

    public CampaignFolder CreateCampaignFolder(CampaignFolder folder)
    {
        folder.Id = Guid.NewGuid();
        folder.CreateDate = DateTime.UtcNow;
        var list = _db.Load<CampaignFolder>(CampaignFile);
        list.Add(folder);
        _db.Save(CampaignFile, list);
        return folder;
    }

    public CampaignFolder? RenameCampaignFolder(Guid id, string name)
    {
        var list = _db.Load<CampaignFolder>(CampaignFile);
        var folder = list.FirstOrDefault(f => f.Id == id && !f.IsDelete);
        if (folder == null) return null;
        folder.Name = name;
        folder.UpdatedDate = DateTime.UtcNow;
        _db.Save(CampaignFile, list);
        return folder;
    }

    public bool DeleteCampaignFolder(Guid id, JsonDataService db)
    {
        var list = _db.Load<CampaignFolder>(CampaignFile);
        var folder = list.FirstOrDefault(f => f.Id == id);
        if (folder == null) return false;
        folder.IsDelete = true;
        _db.Save(CampaignFile, list);

        var campaigns = db.Load<Campaign>("campaigns.json");
        foreach (var c in campaigns.Where(c => c.CampaignFolderId == id))
            c.CampaignFolderId = null;
        db.Save("campaigns.json", campaigns);
        return true;
    }

    public List<SegmentFolder> GetSegmentFolders() =>
        _db.Load<SegmentFolder>(SegmentFile).Where(f => !f.IsDelete).OrderBy(f => f.Name).ToList();

    public SegmentFolder CreateSegmentFolder(SegmentFolder folder)
    {
        folder.Id = Guid.NewGuid();
        folder.CreateDate = DateTime.UtcNow;
        var list = _db.Load<SegmentFolder>(SegmentFile);
        list.Add(folder);
        _db.Save(SegmentFile, list);
        return folder;
    }

    public SegmentFolder? RenameSegmentFolder(Guid id, string name)
    {
        var list = _db.Load<SegmentFolder>(SegmentFile);
        var folder = list.FirstOrDefault(f => f.Id == id && !f.IsDelete);
        if (folder == null) return null;
        folder.Name = name;
        folder.UpdatedDate = DateTime.UtcNow;
        _db.Save(SegmentFile, list);
        return folder;
    }

    public bool DeleteSegmentFolder(Guid id, JsonDataService db)
    {
        var list = _db.Load<SegmentFolder>(SegmentFile);
        var folder = list.FirstOrDefault(f => f.Id == id);
        if (folder == null) return false;
        folder.IsDelete = true;
        _db.Save(SegmentFile, list);

        var segments = db.Load<Segment>("segments.json");
        foreach (var s in segments.Where(s => s.SegmentFolderId == id))
            s.SegmentFolderId = null;
        db.Save("segments.json", segments);
        return true;
    }
}
