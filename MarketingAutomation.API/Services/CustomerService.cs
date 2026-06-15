using MarketingAutomation.API.Models;
using System.Text.RegularExpressions;

namespace MarketingAutomation.API.Services;

public class CustomerService
{
    private readonly JsonDataService _db;
    private const string File = "customers.json";

    public CustomerService(JsonDataService db) => _db = db;

    public DataTableResponse<Customer> GetList(DataTableRequest req, string? filterCriteria = null)
    {
        var all = _db.Load<Customer>(File).AsEnumerable();

        if (!string.IsNullOrWhiteSpace(filterCriteria))
            all = ApplyFilter(all, filterCriteria);

        if (!string.IsNullOrWhiteSpace(req.Search))
            all = all.Where(c =>
                c.FirstName.Contains(req.Search, StringComparison.OrdinalIgnoreCase) ||
                c.LastName.Contains(req.Search, StringComparison.OrdinalIgnoreCase) ||
                c.Email.Contains(req.Search, StringComparison.OrdinalIgnoreCase) ||
                c.City.Contains(req.Search, StringComparison.OrdinalIgnoreCase));

        all = (req.SortBy?.ToLower(), req.SortDir?.ToLower()) switch
        {
            ("name", _) => all.OrderBy(c => c.FirstName),
            ("email", _) => all.OrderBy(c => c.Email),
            ("totalspend", "desc") => all.OrderByDescending(c => c.TotalSpend),
            ("totalspend", _) => all.OrderBy(c => c.TotalSpend),
            ("signupdate", "desc") => all.OrderByDescending(c => c.SignupDate),
            ("signupdate", _) => all.OrderBy(c => c.SignupDate),
            ("lastactivitydate", "desc") => all.OrderByDescending(c => c.LastActivityDate),
            _ => all.OrderByDescending(c => c.LastActivityDate)
        };

        var list = all.ToList();
        var total = list.Count;
        var data = list.Skip((req.Page - 1) * req.PageSize).Take(req.PageSize).ToList();

        return new DataTableResponse<Customer>
        {
            Data = data, TotalCount = total, Page = req.Page,
            PageSize = req.PageSize, TotalPages = (int)Math.Ceiling((double)total / req.PageSize)
        };
    }

    private static IEnumerable<Customer> ApplyFilter(IEnumerable<Customer> all, string filter)
    {
        filter = filter.Trim();
        if (Regex.IsMatch(filter, @"plan\s*=\s*'([^']+)'", RegexOptions.IgnoreCase))
        {
            var m = Regex.Match(filter, @"plan\s*=\s*'([^']+)'", RegexOptions.IgnoreCase);
            var val = m.Groups[1].Value;
            all = all.Where(c => c.Plan.Equals(val, StringComparison.OrdinalIgnoreCase));
        }
        if (Regex.IsMatch(filter, @"age\s*>\s*(\d+)", RegexOptions.IgnoreCase))
        {
            var m = Regex.Match(filter, @"age\s*>\s*(\d+)", RegexOptions.IgnoreCase);
            if (int.TryParse(m.Groups[1].Value, out var age)) all = all.Where(c => c.Age > age);
        }
        if (Regex.IsMatch(filter, @"age\s*<\s*(\d+)", RegexOptions.IgnoreCase))
        {
            var m = Regex.Match(filter, @"age\s*<\s*(\d+)", RegexOptions.IgnoreCase);
            if (int.TryParse(m.Groups[1].Value, out var age)) all = all.Where(c => c.Age < age);
        }
        if (Regex.IsMatch(filter, @"country\s*=\s*'([^']+)'", RegexOptions.IgnoreCase))
        {
            var m = Regex.Match(filter, @"country\s*=\s*'([^']+)'", RegexOptions.IgnoreCase);
            all = all.Where(c => c.Country.Equals(m.Groups[1].Value, StringComparison.OrdinalIgnoreCase));
        }
        if (Regex.IsMatch(filter, @"spend_total\s*>\s*(\d+)", RegexOptions.IgnoreCase))
        {
            var m = Regex.Match(filter, @"spend_total\s*>\s*(\d+)", RegexOptions.IgnoreCase);
            if (decimal.TryParse(m.Groups[1].Value, out var spend)) all = all.Where(c => c.TotalSpend > spend);
        }
        if (filter.Contains("signup_date > 30days", StringComparison.OrdinalIgnoreCase))
        {
            var cutoff = DateTime.UtcNow.AddDays(-30);
            all = all.Where(c => c.SignupDate >= cutoff);
        }
        if (filter.Contains("last_purchase > 60days", StringComparison.OrdinalIgnoreCase))
        {
            var cutoff = DateTime.UtcNow.AddDays(-60);
            all = all.Where(c => c.LastActivityDate <= cutoff);
        }
        return all;
    }
}
