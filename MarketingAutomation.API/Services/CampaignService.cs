using MarketingAutomation.API.Models;

namespace MarketingAutomation.API.Services;

public class CampaignService
{
    private readonly JsonDataService _db;
    private const string File = "campaigns.json";

    public CampaignService(JsonDataService db) => _db = db;

    public DataTableResponse<Campaign> GetList(DataTableRequest req)
    {
        var all = _db.Load<Campaign>(File).Where(c => !c.IsDelete);

        if (!string.IsNullOrWhiteSpace(req.FolderId))
        {
            if (req.FolderId == "unassigned")
                all = all.Where(c => c.CampaignFolderId == null);
            else if (Guid.TryParse(req.FolderId, out var fid))
                all = all.Where(c => c.CampaignFolderId == fid);
        }

        if (!string.IsNullOrWhiteSpace(req.Search))
            all = all.Where(c => c.Name.Contains(req.Search, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(req.Status))
            all = all.Where(c => c.Status.Equals(req.Status, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(req.Type))
            all = all.Where(c => c.Type.Equals(req.Type, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(req.DateFrom) && DateTime.TryParse(req.DateFrom, out var dfrom))
            all = all.Where(c => c.StartDate >= dfrom);

        if (!string.IsNullOrWhiteSpace(req.DateTo) && DateTime.TryParse(req.DateTo, out var dto))
            all = all.Where(c => c.StartDate <= dto);

        all = (req.SortBy?.ToLower(), req.SortDir?.ToLower()) switch
        {
            ("name", "desc") => all.OrderByDescending(c => c.Name),
            ("name", _) => all.OrderBy(c => c.Name),
            ("status", "desc") => all.OrderByDescending(c => c.Status),
            ("status", _) => all.OrderBy(c => c.Status),
            ("type", "desc") => all.OrderByDescending(c => c.Type),
            ("type", _) => all.OrderBy(c => c.Type),
            ("startdate", "desc") => all.OrderByDescending(c => c.StartDate),
            ("startdate", _) => all.OrderBy(c => c.StartDate),
            ("createdate", "desc") => all.OrderByDescending(c => c.CreateDate),
            _ => all.OrderByDescending(c => c.CreateDate)
        };

        var total = all.Count();
        var data = all.Skip((req.Page - 1) * req.PageSize).Take(req.PageSize).ToList();

        return new DataTableResponse<Campaign>
        {
            Data = data, TotalCount = total, Page = req.Page,
            PageSize = req.PageSize, TotalPages = (int)Math.Ceiling((double)total / req.PageSize)
        };
    }

    public Campaign? GetById(Guid id) =>
        _db.Load<Campaign>(File).FirstOrDefault(c => c.Id == id && !c.IsDelete);

    public Campaign Create(Campaign campaign)
    {
        campaign.Id = Guid.NewGuid();
        campaign.CreateDate = DateTime.UtcNow;
        var list = _db.Load<Campaign>(File);
        list.Add(campaign);
        _db.Save(File, list);
        return campaign;
    }

    public Campaign? Update(Guid id, Campaign updated)
    {
        var list = _db.Load<Campaign>(File);
        var existing = list.FirstOrDefault(c => c.Id == id && !c.IsDelete);
        if (existing == null) return null;
        existing.Name = updated.Name;
        existing.Type = updated.Type;
        existing.StartDate = updated.StartDate;
        existing.EndDate = updated.EndDate;
        existing.Status = updated.Status;
        existing.CampaignFolderId = updated.CampaignFolderId;
        existing.SegmentId = updated.SegmentId;
        existing.EmailDesignJson = updated.EmailDesignJson ?? existing.EmailDesignJson;
        existing.UpdatedDate = DateTime.UtcNow;
        existing.UpdatedBy = updated.UpdatedBy;
        _db.Save(File, list);
        return existing;
    }

    public bool Delete(Guid id)
    {
        var list = _db.Load<Campaign>(File);
        var item = list.FirstOrDefault(c => c.Id == id);
        if (item == null) return false;
        item.IsDelete = true;
        item.UpdatedDate = DateTime.UtcNow;
        _db.Save(File, list);
        return true;
    }

    public void BulkDelete(List<Guid> ids)
    {
        var list = _db.Load<Campaign>(File);
        foreach (var item in list.Where(c => ids.Contains(c.Id)))
        {
            item.IsDelete = true;
            item.UpdatedDate = DateTime.UtcNow;
        }
        _db.Save(File, list);
    }

    public void BulkMove(List<Guid> ids, Guid? folderId)
    {
        var list = _db.Load<Campaign>(File);
        foreach (var item in list.Where(c => ids.Contains(c.Id) && !c.IsDelete))
        {
            item.CampaignFolderId = folderId;
            item.UpdatedDate = DateTime.UtcNow;
        }
        _db.Save(File, list);
    }

    public Dictionary<string, int> GetFolderCounts()
    {
        var all = _db.Load<Campaign>(File).Where(c => !c.IsDelete).ToList();
        var counts = new Dictionary<string, int>
        {
            ["all"] = all.Count,
            ["unassigned"] = all.Count(c => c.CampaignFolderId == null)
        };
        foreach (var g in all.Where(c => c.CampaignFolderId != null).GroupBy(c => c.CampaignFolderId!.Value))
            counts[g.Key.ToString()] = g.Count();
        return counts;
    }
}
