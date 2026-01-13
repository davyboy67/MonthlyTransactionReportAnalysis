using DashboardAPI.Controllers.TransportModels;
using DashboardAPI.Repositories;

namespace DashboardAPI.Services
{
    public class DashboardReportService : IDashboardReportService
    {
        private readonly IDashboardRepository _dashboardRepository;

        public DashboardReportService(IDashboardRepository dashboardRepository)
        {
            _dashboardRepository = dashboardRepository;
        }


        public async Task<DashboardDetailsResponse> RetrieveDashboardDetails(DateTime date, int? id)
        {
            var response = new DashboardDetailsResponse();
            response.ReportAnalysis = await _dashboardRepository.GetDashboardDetails(date, id);

            return response;
        }


        public Task SaveDashboardDetails(DashboardDetailsResponse reportAnalysis)
        {
            throw new NotImplementedException();
        }
    }
}
