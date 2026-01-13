using DashboardAPI.Controllers.TransportModels;

namespace DashboardAPI.Repositories
{
    public interface IDashboardRepository
    {
        Task<ReportAnalysis> GetDashboardDetails(DateTime date, int? id);
        Task SaveDashboardDetails(ReportAnalysis reportAnalysis);
    }
}
