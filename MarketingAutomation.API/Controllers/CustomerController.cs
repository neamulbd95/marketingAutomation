using Microsoft.AspNetCore.Mvc;
using MarketingAutomation.API.Models;
using MarketingAutomation.API.Services;

namespace MarketingAutomation.API.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomerController : ControllerBase
{
    private readonly CustomerService _svc;
    private readonly SegmentService _segSvc;

    public CustomerController(CustomerService svc, SegmentService segSvc)
    {
        _svc = svc;
        _segSvc = segSvc;
    }

    [HttpGet]
    public IActionResult GetList([FromQuery] DataTableRequest req, [FromQuery] Guid? segmentId = null)
    {
        string? filter = null;
        if (segmentId.HasValue)
        {
            var seg = _segSvc.GetById(segmentId.Value);
            filter = seg?.Filter;
        }
        return Ok(ApiResponse<DataTableResponse<Customer>>.Ok(_svc.GetList(req, filter)));
    }
}
