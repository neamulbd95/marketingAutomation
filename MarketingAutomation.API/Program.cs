using MarketingAutomation.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(opts => opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<JsonDataService>();
builder.Services.AddScoped<CampaignService>();
builder.Services.AddScoped<SegmentService>();
builder.Services.AddScoped<EmailTemplateService>();
builder.Services.AddScoped<FolderService>();
builder.Services.AddScoped<SettingsService>();
builder.Services.AddScoped<CustomerService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseStaticFiles();
app.MapControllers();

app.Run();
