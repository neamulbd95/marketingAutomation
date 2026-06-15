using Microsoft.AspNetCore.Mvc;
using MarketingAutomation.API.Models;
using MarketingAutomation.API.Services;

namespace MarketingAutomation.API.Controllers;

[ApiController]
public class FolderController : ControllerBase
{
    private readonly FolderService _svc;
    private readonly JsonDataService _db;

    public FolderController(FolderService svc, JsonDataService db)
    {
        _svc = svc;
        _db = db;
    }

    // Campaign Folders
    [HttpGet("api/campaign-folders")]
    public IActionResult GetCampaignFolders() =>
        Ok(ApiResponse<List<CampaignFolder>>.Ok(_svc.GetCampaignFolders()));

    [HttpPost("api/campaign-folders")]
    public IActionResult CreateCampaignFolder([FromBody] CampaignFolder folder) =>
        Ok(ApiResponse<CampaignFolder>.Ok(_svc.CreateCampaignFolder(folder), "Folder created"));

    [HttpPut("api/campaign-folders/{id:guid}")]
    public IActionResult RenameCampaignFolder(Guid id, [FromBody] RenameRequest req)
    {
        var folder = _svc.RenameCampaignFolder(id, req.Name);
        return folder == null ? NotFound(ApiResponse<CampaignFolder>.Fail("Not found")) : Ok(ApiResponse<CampaignFolder>.Ok(folder, "Folder renamed"));
    }

    [HttpDelete("api/campaign-folders/{id:guid}")]
    public IActionResult DeleteCampaignFolder(Guid id)
    {
        var ok = _svc.DeleteCampaignFolder(id, _db);
        return ok ? Ok(ApiResponse<bool>.Ok(true, "Folder deleted")) : NotFound(ApiResponse<bool>.Fail("Not found"));
    }

    // Segment Folders
    [HttpGet("api/segment-folders")]
    public IActionResult GetSegmentFolders() =>
        Ok(ApiResponse<List<SegmentFolder>>.Ok(_svc.GetSegmentFolders()));

    [HttpPost("api/segment-folders")]
    public IActionResult CreateSegmentFolder([FromBody] SegmentFolder folder) =>
        Ok(ApiResponse<SegmentFolder>.Ok(_svc.CreateSegmentFolder(folder), "Folder created"));

    [HttpPut("api/segment-folders/{id:guid}")]
    public IActionResult RenameSegmentFolder(Guid id, [FromBody] RenameRequest req)
    {
        var folder = _svc.RenameSegmentFolder(id, req.Name);
        return folder == null ? NotFound(ApiResponse<SegmentFolder>.Fail("Not found")) : Ok(ApiResponse<SegmentFolder>.Ok(folder, "Folder renamed"));
    }

    [HttpDelete("api/segment-folders/{id:guid}")]
    public IActionResult DeleteSegmentFolder(Guid id)
    {
        var ok = _svc.DeleteSegmentFolder(id, _db);
        return ok ? Ok(ApiResponse<bool>.Ok(true, "Folder deleted")) : NotFound(ApiResponse<bool>.Fail("Not found"));
    }
}

public record RenameRequest(string Name);
