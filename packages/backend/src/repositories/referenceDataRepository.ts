import { DataSource } from 'typeorm';
import { CategoryDefinition, MerchantRules } from '@transaction-report/shared';

export interface IReferenceDataRepository {
  getCategories(): Promise<CategoryDefinition[]>;
  getMerchantRules(): Promise<MerchantRules>;
}

export class ReferenceDataRepository implements IReferenceDataRepository {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  async getCategories(): Promise<CategoryDefinition[]> {
    const rows: Array<{ name: string; display_name: string }> = await this.dataSource.query(
      `SELECT name, display_name FROM category ORDER BY sort_order`
    );

    return rows.map(r => ({ name: r.name, displayName: r.display_name }));
  }

  async getMerchantRules(): Promise<MerchantRules> {
    const patternRows: Array<{ pattern: string; merchant_name: string }> =
      await this.dataSource.query(
        `SELECT pattern, merchant_name FROM merchant_pattern ORDER BY LENGTH(pattern) DESC, pattern`
      );

    const categoryRows: Array<{ name: string; default_category: string }> =
      await this.dataSource.query(
        `SELECT name, default_category FROM merchant WHERE default_category IS NOT NULL`
      );

    return {
      patterns: patternRows.map(r => ({ pattern: r.pattern, merchantName: r.merchant_name })),
      defaultCategories: new Map(categoryRows.map(r => [r.name, r.default_category])),
    };
  }
}
