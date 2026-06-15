using Microsoft.AspNetCore.Mvc;
using MarketingAutomation.API.Models;
using MarketingAutomation.API.Services;

namespace MarketingAutomation.API.Controllers;

[ApiController]
[Route("api/campaigns")]
public class CampaignController : ControllerBase
{
    private readonly CampaignService _svc;

    public CampaignController(CampaignService svc) => _svc = svc;

    [HttpGet]
    public IActionResult GetList([FromQuery] DataTableRequest req) =>
        Ok(ApiResponse<DataTableResponse<Campaign>>.Ok(_svc.GetList(req)));

    [HttpGet("{id:guid}")]
    public IActionResult GetById(Guid id)
    {
        var item = _svc.GetById(id);
        return item == null ? NotFound(ApiResponse<Campaign>.Fail("Not found")) : Ok(ApiResponse<Campaign>.Ok(item));
    }

    [HttpPost]
    public IActionResult Create([FromBody] Campaign campaign) =>
        Ok(ApiResponse<Campaign>.Ok(_svc.Create(campaign), "Campaign created"));

    [HttpPut("{id:guid}")]
    public IActionResult Update(Guid id, [FromBody] Campaign campaign)
    {
        var updated = _svc.Update(id, campaign);
        return updated == null ? NotFound(ApiResponse<Campaign>.Fail("Not found")) : Ok(ApiResponse<Campaign>.Ok(updated, "Campaign updated"));
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        var ok = _svc.Delete(id);
        return ok ? Ok(ApiResponse<bool>.Ok(true, "Campaign deleted")) : NotFound(ApiResponse<bool>.Fail("Not found"));
    }

    [HttpPost("bulk-delete")]
    public IActionResult BulkDelete([FromBody] BulkDeleteRequest req)
    {
        _svc.BulkDelete(req.Ids);
        return Ok(ApiResponse<bool>.Ok(true, $"{req.Ids.Count} campaign(s) deleted"));
    }

    [HttpPost("bulk-move")]
    public IActionResult BulkMove([FromBody] BulkMoveRequest req)
    {
        _svc.BulkMove(req.Ids, req.FolderId);
        return Ok(ApiResponse<bool>.Ok(true, $"{req.Ids.Count} campaign(s) moved"));
    }

    [HttpGet("folder-counts")]
    public IActionResult GetFolderCounts() =>
        Ok(ApiResponse<Dictionary<string, int>>.Ok(_svc.GetFolderCounts()));
}
