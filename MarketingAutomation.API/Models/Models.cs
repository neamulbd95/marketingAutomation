namespace MarketingAutomation.API.Models;

public class Campaign
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public string CreateBy { get; set; } = "";
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDelete { get; set; } = false;
    public Guid? CampaignFolderId { get; set; }
    public Guid? SegmentId { get; set; }
    public string? EmailDesignJson { get; set; }
}

public class Segment
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public string Filter { get; set; } = "";
    public int EstimatedCount { get; set; }
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public string CreateBy { get; set; } = "";
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDelete { get; set; } = false;
    public Guid? SegmentFolderId { get; set; }
}

public class EmailTemplate
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Category { get; set; } = "";
    public string HtmlBody { get; set; } = "";
    public string? EmailDesignJson { get; set; }
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public string CreateBy { get; set; } = "";
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDelete { get; set; } = false;
}

public class CampaignFolder
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public string CreateBy { get; set; } = "";
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDelete { get; set; } = false;
}

public class SegmentFolder
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public string CreateBy { get; set; } = "";
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDelete { get; set; } = false;
}

public class Customer
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public int Age { get; set; }
    public string Country { get; set; } = "";
    public string City { get; set; } = "";
    public string Plan { get; set; } = "";
    public string Status { get; set; } = "";
    public string JobTitle { get; set; } = "";
    public string Industry { get; set; } = "";
    public decimal TotalSpend { get; set; }
    public int SessionCount { get; set; }
    public bool EmailSubscribed { get; set; } = true;
    public bool SmsSubscribed { get; set; } = false;
    public DateTime SignupDate { get; set; }
    public DateTime LastActivityDate { get; set; }
}

public class AppSettings
{
    public GeneralSettings General { get; set; } = new();
    public EmailSmtpSettings Email { get; set; } = new();
    public NotificationSettings Notifications { get; set; } = new();
    public ApiSettings Api { get; set; } = new();
    public BrandingSettings Branding { get; set; } = new();
    public UserPreferences Preferences { get; set; } = new();
}

public class GeneralSettings
{
    public string CompanyName { get; set; } = "Acme Corp";
    public string Website { get; set; } = "https://acmecorp.com";
    public string Timezone { get; set; } = "UTC";
    public string Language { get; set; } = "en-US";
    public string DateFormat { get; set; } = "MM/DD/YYYY";
}

public class EmailSmtpSettings
{
    public string SmtpHost { get; set; } = "smtp.example.com";
    public int SmtpPort { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromName { get; set; } = "Marketing Team";
    public string FromEmail { get; set; } = "noreply@acmecorp.com";
    public string ReplyToEmail { get; set; } = "support@acmecorp.com";
    public bool EnableSsl { get; set; } = true;
}

public class NotificationSettings
{
    public bool EmailNotifications { get; set; } = true;
    public bool BrowserNotifications { get; set; } = false;
    public bool CampaignStartAlert { get; set; } = true;
    public bool CampaignEndAlert { get; set; } = true;
    public bool WeeklyReport { get; set; } = true;
}

public class ApiSettings
{
    public string ApiKey { get; set; } = "mk_live_abc123xyz456";
    public string WebhookUrl { get; set; } = "";
    public int RateLimitPerMinute { get; set; } = 100;
}

public class BrandingSettings
{
    public string PrimaryColor { get; set; } = "#1E3A5F";
    public string AccentColor { get; set; } = "#3B82F6";
    public string LogoUrl { get; set; } = "";
}

public class UserPreferences
{
    public int DefaultPageSize { get; set; } = 50;
    public string DefaultView { get; set; } = "list";
    public string Theme { get; set; } = "light";
}

public class DataTableRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public string SortDir { get; set; } = "asc";
    public string? Status { get; set; }
    public string? Type { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public string? FolderId { get; set; }
}

public class DataTableResponse<T>
{
    public List<T> Data { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class BulkMoveRequest
{
    public List<Guid> Ids { get; set; } = new();
    public Guid? FolderId { get; set; }
}

public class BulkDeleteRequest
{
    public List<Guid> Ids { get; set; } = new();
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message) =>
        new() { Success = false, Message = message };
}
