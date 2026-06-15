using MarketingAutomation.API.Models;

namespace MarketingAutomation.API.Services;

public class EmailTemplateService
{
    private readonly JsonDataService _db;
    private const string File = "email_templates.json";

    public EmailTemplateService(JsonDataService db) => _db = db;

    public DataTableResponse<EmailTemplate> GetList(DataTableRequest req)
    {
        var all = _db.Load<EmailTemplate>(File).Where(t => !t.IsDelete);

        if (!string.IsNullOrWhiteSpace(req.Search))
            all = all.Where(t => t.Name.Contains(req.Search, StringComparison.OrdinalIgnoreCase)
                              || t.Subject.Contains(req.Search, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(req.Type))
            all = all.Where(t => t.Category.Equals(req.Type, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(req.DateFrom) && DateTime.TryParse(req.DateFrom, out var dfrom))
            all = all.Where(t => t.CreateDate >= dfrom);

        if (!string.IsNullOrWhiteSpace(req.DateTo) && DateTime.TryParse(req.DateTo, out var dto))
            all = all.Where(t => t.CreateDate <= dto);

        all = (req.SortBy?.ToLower(), req.SortDir?.ToLower()) switch
        {
            ("name", "desc") => all.OrderByDescending(t => t.Name),
            ("name", _) => all.OrderBy(t => t.Name),
            ("category", "desc") => all.OrderByDescending(t => t.Category),
            ("category", _) => all.OrderBy(t => t.Category),
            ("createdate", "desc") => all.OrderByDescending(t => t.CreateDate),
            ("updateddate", "desc") => all.OrderByDescending(t => t.UpdatedDate),
            ("updateddate", _) => all.OrderBy(t => t.UpdatedDate),
            _ => all.OrderByDescending(t => t.CreateDate)
        };

        var total = all.Count();
        var data = all.Skip((req.Page - 1) * req.PageSize).Take(req.PageSize).ToList();

        return new DataTableResponse<EmailTemplate>
        {
            Data = data, TotalCount = total, Page = req.Page,
            PageSize = req.PageSize, TotalPages = (int)Math.Ceiling((double)total / req.PageSize)
        };
    }

    public EmailTemplate? GetById(Guid id) =>
        _db.Load<EmailTemplate>(File).FirstOrDefault(t => t.Id == id && !t.IsDelete);

    public EmailTemplate Create(EmailTemplate template)
    {
        template.Id = Guid.NewGuid();
        template.CreateDate = DateTime.UtcNow;
        var list = _db.Load<EmailTemplate>(File);
        list.Add(template);
        _db.Save(File, list);
        return template;
    }

    public EmailTemplate? Update(Guid id, EmailTemplate updated)
    {
        var list = _db.Load<EmailTemplate>(File);
        var existing = list.FirstOrDefault(t => t.Id == id && !t.IsDelete);
        if (existing == null) return null;
        existing.Name = updated.Name;
        existing.Subject = updated.Subject;
        existing.Category = updated.Category;
        existing.HtmlBody = updated.HtmlBody;
        existing.EmailDesignJson = updated.EmailDesignJson;
        existing.UpdatedDate = DateTime.UtcNow;
        existing.UpdatedBy = updated.UpdatedBy;
        _db.Save(File, list);
        return existing;
    }

    public bool Delete(Guid id)
    {
        var list = _db.Load<EmailTemplate>(File);
        var item = list.FirstOrDefault(t => t.Id == id);
        if (item == null) return false;
        item.IsDelete = true;
        item.UpdatedDate = DateTime.UtcNow;
        _db.Save(File, list);
        return true;
    }

    public void BulkDelete(List<Guid> ids)
    {
        var list = _db.Load<EmailTemplate>(File);
        foreach (var item in list.Where(t => ids.Contains(t.Id)))
        {
            item.IsDelete = true;
            item.UpdatedDate = DateTime.UtcNow;
        }
        _db.Save(File, list);
    }
}
