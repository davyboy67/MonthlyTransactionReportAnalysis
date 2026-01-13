namespace DashboardAPI.Controllers.TransportModels
{
    public class DashboardDetailsRequest
    {
        public DateTime Date { get; set; }
        public int? id { get; set; }
    }

    public class DashboardSaveInfoRequest
    {
        public ReportAnalysis ReportAnalysis { get; set; }
    }
}
