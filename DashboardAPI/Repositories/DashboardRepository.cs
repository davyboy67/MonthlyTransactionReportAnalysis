using DashboardAPI.Controllers.TransportModels;
using Npgsql;
using System.Data.SqlClient;

namespace DashboardAPI.Repositories
{
    public class DashboardRepository : IDashboardRepository
    {
        private readonly NpgsqlConnection _connectionFactory;
        public DashboardRepository(NpgsqlConnection connectionFactory) 
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<ReportAnalysis> GetDashboardDetails(DateTime date, int? id)
        {
            var reportAnalysis = new ReportAnalysis();
            try
            {
                await using var conn = _connectionFactory;
                await conn.OpenAsync();
                var sql = "";

                if (id != null)
                {
                    sql = $"SELECT * FROM reportanalysis WHERE id = {id}";
                }
                else
                {
                    var today = DateTime.Today;
                    sql = $"SELECT * FROM reportanalysis WHERE reportdate = '{today}'";
                }

                using var cmd = new NpgsqlCommand(sql, conn);

                using var reader = cmd.ExecuteReader();

                if (!reader.Read())
                    return null;

                reportAnalysis.Date = reader.GetDateTime(1);
                reportAnalysis.TotalIncome = reader.GetDecimal(2);
                reportAnalysis.TotalExpenses = reader.GetDecimal(3);

                //then get the transactions for the report
                var reportID = reader.GetInt16(0);

                //dispose of the old reader to create another one
                reader.Close();

                var transactionSql = $"SELECT * FROM transaction WHERE report_analysis_id = {reportID}";

                await using var tranCmd = new NpgsqlCommand(transactionSql, conn);
                using var transReader = tranCmd.ExecuteReader();

                var transactionList = new List<Transaction>();



                while (transReader.Read()) 
                { 
                    var transaction = new Transaction();
                    transaction.Date = transReader.GetDateTime(2);
                    transaction.Description = transReader.GetString(3);
                    transaction.Amount = transReader.GetDecimal(4);
                    transaction.Category = transReader.GetString(5);
                    transaction.Merchant = transReader.GetString(6);
                    transaction.Month = transaction.Date.Month.ToString();
                    transactionList.Add(transaction);
                }

                reportAnalysis.CategorySummaries = CompileCategorySummary(transactionList);
                transReader.Close();
          
                return reportAnalysis;

                
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
                throw;
            }
        }

        private List<CategorySummary> CompileCategorySummary(List<Transaction> transactionList)
        {
            List<CategorySummary> categorySummary = [];
            var uniqueCategories = transactionList.Select(t => t.Category).Distinct().ToList();

            foreach (var category in uniqueCategories) 
            {
                List<Transaction> categoryTransactions = [];
                categoryTransactions = transactionList.Where(t => t.Category == category).ToList();

                var summary = new CategorySummary();
                summary.TotalAmount = categoryTransactions.Select(t => t.Amount).Sum();
                summary.Merchants = categorySummary.SelectMany(t => t.Merchants).Distinct().ToArray();
                summary.CategoryName = category;
                summary.Transactions = categoryTransactions;
                categorySummary.Add(summary);
            }

            return categorySummary;
        }

        public Task SaveDashboardDetails(ReportAnalysis reportAnalysis)
        {
            throw new NotImplementedException();
        }
    }
}
