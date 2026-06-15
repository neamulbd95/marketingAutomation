using MarketingAutomation.API.Models;

namespace MarketingAutomation.API.Services;

public class SegmentService
{
    private readonly JsonDataService _db;
    private const string File = "segments.json";

    public SegmentService(JsonDataService db) => _db = db;

    public DataTableResponse<Segment> GetList(DataTableRequest req)
    {
        var all = _db.Load<Segment>(File).Where(s => !s.IsDelete);

        if (!string.IsNullOrWhiteSpace(req.FolderId))
        {
            if (req.FolderId == "unassigned")
                all = all.Where(s => s.SegmentFolderId == null);
            else if (Guid.TryParse(req.FolderId, out var fid))
                all = all.Where(s => s.SegmentFolderId == fid);
        }

        if (!string.IsNullOrWhiteSpace(req.Search))
            all = all.Where(s => s.Name.Contains(req.Search, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(req.Type))
            all = all.Where(s => s.Type.Equals(req.Type, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(req.DateFrom) && DateTime.TryParse(req.DateFrom, out var dfrom))
            all = all.Where(s => s.CreateDate >= dfrom);

        if (!string.IsNullOrWhiteSpace(req.DateTo) && DateTime.TryParse(req.DateTo, out var dto))
            all = all.Where(s => s.CreateDate <= dto);

        all = (req.SortBy?.ToLower(), req.SortDir?.ToLower()) switch
        {
            ("name", "desc") => all.OrderByDescending(s => s.Name),
            ("name", _) => all.OrderBy(s => s.Name),
            ("type", "desc") => all.OrderByDescending(s => s.Type),
            ("type", _) => all.OrderBy(s => s.Type),
            ("estimatedcount", "desc") => all.OrderByDescending(s => s.EstimatedCount),
            ("estimatedcount", _) => all.OrderBy(s => s.EstimatedCount),
            ("createdate", "desc") => all.OrderByDescending(s => s.CreateDate),
            _ => all.OrderByDescending(s => s.CreateDate)
        };

        var total = all.Count();
        var data = all.Skip((req.Page - 1) * req.PageSize).Take(req.PageSize).ToList();

        return new DataTableResponse<Segment>
        {
            Data = data, TotalCount = total, Page = req.Page,
            PageSize = req.PageSize, TotalPages = (int)Math.Ceiling((double)total / req.PageSize)
        };
    }

    public Segment? GetById(Guid id) =>
        _db.Load<Segment>(File).FirstOrDefault(s => s.Id == id && !s.IsDelete);

    public Segment Create(Segment segment)
    {
        segment.Id = Guid.NewGuid();
        segment.CreateDate = DateTime.UtcNow;
        var list = _db.Load<Segment>(File);
        list.Add(segment);
        _db.Save(File, list);
        return segment;
    }

    public Segment? Update(Guid id, Segment updated)
    {
        var list = _db.Load<Segment>(File);
        var existing = list.FirstOrDefault(s => s.Id == id && !s.IsDelete);
        if (existing == null) return null;
        existing.Name = updated.Name;
        existing.Type = updated.Type;
        existing.Filter = updated.Filter;
        existing.EstimatedCount = updated.EstimatedCount;
        existing.SegmentFolderId = updated.SegmentFolderId;
        existing.UpdatedDate = DateTime.UtcNow;
        existing.UpdatedBy = updated.UpdatedBy;
        _db.Save(File, list);
        return existing;
    }

    public bool Delete(Guid id)
    {
        var list = _db.Load<Segment>(File);
        var item = list.FirstOrDefault(s => s.Id == id);
        if (item == null) return false;
        item.IsDelete = true;
        item.UpdatedDate = DateTime.UtcNow;
        _db.Save(File, list);
        return true;
    }

    public void BulkDelete(List<Guid> ids)
    {
        var list = _db.Load<Segment>(File);
        foreach (var item in list.Where(s => ids.Contains(s.Id)))
        {
            item.IsDelete = true;
            item.UpdatedDate = DateTime.UtcNow;
        }
        _db.Save(File, list);
    }

    public void BulkMove(List<Guid> ids, Guid? folderId)
    {
        var list = _db.Load<Segment>(File);
        foreach (var item in list.Where(s => ids.Contains(s.Id) && !s.IsDelete))
        {
            item.SegmentFolderId = folderId;
            item.UpdatedDate = DateTime.UtcNow;
        }
        _db.Save(File, list);
    }

    public Dictionary<string, int> GetFolderCounts()
    {
        var all = _db.Load<Segment>(File).Where(s => !s.IsDelete).ToList();
        var counts = new Dictionary<string, int>
        {
            ["all"] = all.Count,
            ["unassigned"] = all.Count(s => s.SegmentFolderId == null)
        };
        foreach (var g in all.Where(s => s.SegmentFolderId != null).GroupBy(s => s.SegmentFolderId!.Value))
            counts[g.Key.ToString()] = g.Count();
        return counts;
    }
}
