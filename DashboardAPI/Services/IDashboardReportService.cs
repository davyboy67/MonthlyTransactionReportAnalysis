using DashboardAPI.Controllers.TransportModels;

namespace DashboardAPI.Services
{
    public interface IDashboardReportService
    {
        public Task<DashboardDetailsResponse> RetrieveDashboardDetails(DateTime date, int? id);
        public Task SaveDashboardDetails(DashboardDetailsResponse reportAnalysis);

    }
}
