using Microsoft.AspNetCore.Mvc;
using MarketingAutomation.API.Models;
using MarketingAutomation.API.Services;

namespace MarketingAutomation.API.Controllers;

[ApiController]
[Route("api/segments")]
public class SegmentController : ControllerBase
{
    private readonly SegmentService _svc;

    public SegmentController(SegmentService svc) => _svc = svc;

    [HttpGet]
    public IActionResult GetList([FromQuery] DataTableRequest req) =>
        Ok(ApiResponse<DataTableResponse<Segment>>.Ok(_svc.GetList(req)));

    [HttpGet("{id:guid}")]
    public IActionResult GetById(Guid id)
    {
        var item = _svc.GetById(id);
        return item == null ? NotFound(ApiResponse<Segment>.Fail("Not found")) : Ok(ApiResponse<Segment>.Ok(item));
    }

    [HttpPost]
    public IActionResult Create([FromBody] Segment segment) =>
        Ok(ApiResponse<Segment>.Ok(_svc.Create(segment), "Segment created"));

    [HttpPut("{id:guid}")]
    public IActionResult Update(Guid id, [FromBody] Segment segment)
    {
        var updated = _svc.Update(id, segment);
        return updated == null ? NotFound(ApiResponse<Segment>.Fail("Not found")) : Ok(ApiResponse<Segment>.Ok(updated, "Segment updated"));
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        var ok = _svc.Delete(id);
        return ok ? Ok(ApiResponse<bool>.Ok(true, "Segment deleted")) : NotFound(ApiResponse<bool>.Fail("Not found"));
    }

    [HttpPost("bulk-delete")]
    public IActionResult BulkDelete([FromBody] BulkDeleteRequest req)
    {
        _svc.BulkDelete(req.Ids);
        return Ok(ApiResponse<bool>.Ok(true, $"{req.Ids.Count} segment(s) deleted"));
    }

    [HttpPost("bulk-move")]
    public IActionResult BulkMove([FromBody] BulkMoveRequest req)
    {
        _svc.BulkMove(req.Ids, req.FolderId);
        return Ok(ApiResponse<bool>.Ok(true, $"{req.Ids.Count} segment(s) moved"));
    }

    [HttpGet("folder-counts")]
    public IActionResult GetFolderCounts() =>
        Ok(ApiResponse<Dictionary<string, int>>.Ok(_svc.GetFolderCounts()));
}
