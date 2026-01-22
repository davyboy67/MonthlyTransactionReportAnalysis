using DashboardAPI.Controllers.TransportModels;
using Npgsql;
using System.Data.SqlClient;
using System.Diagnostics;

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
                    DateTime queryDate = date;
                    sql = $"SELECT * FROM reportanalysis WHERE reportdate = '{queryDate}'";
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

        public async Task SaveDashboardDetails(ReportAnalysis reportAnalysis)
        {
            try
            {
                await using var conn = _connectionFactory;
                
                var sw = Stopwatch.StartNew();
                await conn.OpenAsync();

                var sql = """INSERT INTO reportanalysis (report_date, total_income, total_expenses, user_id) VALUES (@date, @totalIncome, @totalExpenses, @userID) RETURNING id""";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("date", reportAnalysis.Date);
                cmd.Parameters.AddWithValue("totalIncome", reportAnalysis.TotalIncome);
                cmd.Parameters.AddWithValue("totalExpenses", reportAnalysis.TotalExpenses);
                //an enhancement will need to be made once there is more than one user
                cmd.Parameters.AddWithValue("userID", 1);

                var reportId = (int)await cmd.ExecuteScalarAsync();
                Console.WriteLine("Report saved to db");

                var transactions = reportAnalysis.CategorySummaries.SelectMany(cs => cs.Transactions).ToList();

                foreach (var transaction in transactions)
                {
                    //change to parameterized sql command
                    var transactionSql = """INSERT INTO transaction (report_analysis_id, date, description, amount, category, merchant, user_id) VALUES (@reportId, @transactionDate, @transactionDescription, @transactionAmount, @transactionCategory, @transactionMerchant, @userID)""";
                    await using var tranCmd = new NpgsqlCommand(transactionSql, conn);
                    tranCmd.Parameters.AddWithValue("reportId", reportId);
                    tranCmd.Parameters.AddWithValue("transactionDate", transaction.Date);
                    tranCmd.Parameters.AddWithValue("transactionDescription", transaction.Description ?? "");
                    tranCmd.Parameters.AddWithValue("transactionAmount", transaction.Amount);
                    tranCmd.Parameters.AddWithValue("transactionCategory", transaction.Category ?? "");
                    tranCmd.Parameters.AddWithValue("transactionMerchant", transaction.Merchant ?? "");
                    //an enhancement will need to be made once there is more than one user
                    tranCmd.Parameters.AddWithValue("userID", 1);
                    await tranCmd.ExecuteNonQueryAsync();
                }
                sw.Stop();
                Console.WriteLine($"Transactions saved to db in {sw.Elapsed}");

            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
                throw;
            }
        }
    }
}
