using Microsoft.AspNetCore.Mvc;
using MarketingAutomation.API.Models;
using MarketingAutomation.API.Services;

namespace MarketingAutomation.API.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly SettingsService _svc;

    public SettingsController(SettingsService svc) => _svc = svc;

    [HttpGet]
    public IActionResult Get() => Ok(ApiResponse<AppSettings>.Ok(_svc.Get()));

    [HttpPut]
    public IActionResult Save([FromBody] AppSettings settings) =>
        Ok(ApiResponse<AppSettings>.Ok(_svc.Save(settings), "Settings saved"));
}
