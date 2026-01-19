import { DashboardService } from '../backend/src/services/DashboardService';
import { IDashboardRepository } from '../backend/src/repositories/DashboardRepository';
import { ReportAnalysis } from '../backend/src/models/types';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockRepository: jest.Mocked<IDashboardRepository>;

  beforeEach(() => {
    mockRepository = {
      getDashboardDetails: jest.fn(),
      saveDashboardDetails: jest.fn()
    };
    service = new DashboardService(mockRepository);
  });

  describe('retrieveDashboardDetails', () => {
    it('should return dashboard details response', async () => {
      const mockReport: ReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        CategorySummaries: []
      };

      mockRepository.getDashboardDetails.mockResolvedValue(mockReport);

      const result = await service.retrieveDashboardDetails(new Date('2024-01-01'));

      expect(result.ReportAnalysis).toEqual(mockReport);
      expect(mockRepository.getDashboardDetails).toHaveBeenCalledWith(new Date('2024-01-01'), undefined);
    });

    it('should pass id parameter correctly', async () => {
      mockRepository.getDashboardDetails.mockResolvedValue(null);

      await service.retrieveDashboardDetails(new Date('2024-01-01'), 1);

      expect(mockRepository.getDashboardDetails).toHaveBeenCalledWith(new Date('2024-01-01'), 1);
    });
  });

  describe('saveDashboardDetails', () => {
    it('should save dashboard details', async () => {
      const mockReport: ReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        CategorySummaries: []
      };

      mockRepository.saveDashboardDetails.mockResolvedValue();

      await service.saveDashboardDetails(mockReport);

      expect(mockRepository.saveDashboardDetails).toHaveBeenCalledWith(mockReport);
    });
  });
});
