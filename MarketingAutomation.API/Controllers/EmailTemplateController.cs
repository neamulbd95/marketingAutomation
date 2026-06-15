using Microsoft.AspNetCore.Mvc;
using MarketingAutomation.API.Models;
using MarketingAutomation.API.Services;

namespace MarketingAutomation.API.Controllers;

[ApiController]
[Route("api/email-templates")]
public class EmailTemplateController : ControllerBase
{
    private readonly EmailTemplateService _svc;

    public EmailTemplateController(EmailTemplateService svc) => _svc = svc;

    [HttpGet]
    public IActionResult GetList([FromQuery] DataTableRequest req) =>
        Ok(ApiResponse<DataTableResponse<EmailTemplate>>.Ok(_svc.GetList(req)));

    [HttpGet("{id:guid}")]
    public IActionResult GetById(Guid id)
    {
        var item = _svc.GetById(id);
        return item == null ? NotFound(ApiResponse<EmailTemplate>.Fail("Not found")) : Ok(ApiResponse<EmailTemplate>.Ok(item));
    }

    [HttpPost]
    public IActionResult Create([FromBody] EmailTemplate template) =>
        Ok(ApiResponse<EmailTemplate>.Ok(_svc.Create(template), "Template created"));

    [HttpPut("{id:guid}")]
    public IActionResult Update(Guid id, [FromBody] EmailTemplate template)
    {
        var updated = _svc.Update(id, template);
        return updated == null ? NotFound(ApiResponse<EmailTemplate>.Fail("Not found")) : Ok(ApiResponse<EmailTemplate>.Ok(updated, "Template updated"));
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        var ok = _svc.Delete(id);
        return ok ? Ok(ApiResponse<bool>.Ok(true, "Template deleted")) : NotFound(ApiResponse<bool>.Fail("Not found"));
    }

    [HttpPost("bulk-delete")]
    public IActionResult BulkDelete([FromBody] BulkDeleteRequest req)
    {
        _svc.BulkDelete(req.Ids);
        return Ok(ApiResponse<bool>.Ok(true, $"{req.Ids.Count} template(s) deleted"));
    }
}
