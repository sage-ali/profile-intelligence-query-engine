export type ImportSkipReasons = Record<string, number>;

export type ImportResult = {
  status: 'success';
  total_rows: number;
  inserted: number;
  skipped: number;
  reasons: ImportSkipReasons;
};
