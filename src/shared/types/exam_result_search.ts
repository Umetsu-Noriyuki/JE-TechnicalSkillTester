/**
 * 閲覧画面（15章）の検索条件。全項目AND条件で絞り込む。空文字／未指定の項目は条件に含めない。
 */
export interface ExamResultSearchFilter {
  /** 受験日時（A列）の検索開始日。'YYYY-MM-DD'形式。 */
  recordedAtFrom?: string;
  /** 受験日時（A列）の検索終了日。'YYYY-MM-DD'形式（当日の終わりまでを含む）。 */
  recordedAtTo?: string;
  /** 受験者区分（B列）。ROLE_LABELSの値と完全一致。未指定なら全区分が対象。 */
  roleLabel?: string;
  /** 氏名（C列）。部分一致。 */
  name?: string;
  /** 社員番号（D列）。部分一致。 */
  employeeNumber?: string;
  /** 所属（E列）。部分一致。 */
  department?: string;
}

/** 検索結果一覧の1行分（15章）。詳細取得前の軽量な要約情報。 */
export interface ExamResultSummary {
  /** 「受験結果」シートの行番号。詳細取得のキーとなる。 */
  rowNumber: number;
  /** ISO 8601形式の日時文字列。 */
  recordedAt: string;
  roleLabel: string;
  name: string;
  employeeNumber: string;
  department: string;
  /** 0〜100（10-3章）。 */
  overallCorrectRate: number;
}
