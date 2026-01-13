using DashboardAPI.Controllers.TransportModels;
using DashboardAPI.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel;
using System.Net.WebSockets;
using System.Threading.Tasks;

namespace DashboardAPI.Controllers.v1
{
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardReportService _transactionService;

        public DashboardController(IDashboardReportService transactionService)
        {
            _transactionService = transactionService;
        }

        [Route("api/v1/RetrieveDashboardDetails")]
        [HttpPost]
        public async Task<ActionResult<DashboardDetailsResponse>> RetrieveDashboardDetails([FromBody] DashboardDetailsRequest request)
        {
            var response = await _transactionService.RetrieveDashboardDetails(request.Date, request.id);

            return response;
        }

        //[Route("api/v1/SaveReportInformation")]
        //[HttpPost]
        //public async Task SaveReportInformation(DashboardSaveInfoRequest request)
        //{
        //    var response = await _transactionService.RetrieveDashboardDetails(request.ReportAnalysis);

        //}

        //[Route("api/v1/trend")]
        //public ActionResult PreviousMonthTrendetails(DateTime date, int? id)
        //{
        //    return View();
        //}

    }
}
