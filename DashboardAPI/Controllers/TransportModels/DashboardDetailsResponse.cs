namespace DashboardAPI.Controllers.TransportModels
{
    public class DashboardDetailsResponse
    {
        public ReportAnalysis ReportAnalysis { get; set; }
    }

    public class ReportAnalysis
    {
        public DateTime Date { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal TotalExpenses { get; set; }
        public List<CategorySummary> CategorySummaries { get; set; }
    }

    public class CategorySummary
    {
        public string CategoryName { get; set; }
        public string[] Merchants { get; set; }
        public decimal TotalAmount { get; set; }
        public List<Transaction> Transactions { get; set; }
    }

    public class Transaction 
    {
        public string Month { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; }
        public string Merchant { get; set; }
    }
}
