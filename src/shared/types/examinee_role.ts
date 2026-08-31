export type ExamineeRole = 'applicant' | 'newhire' | 'junior';

export const EXAMINEE_ROLES: readonly ExamineeRole[] = ['applicant', 'newhire', 'junior'];

export const isExamineeRole = (value: unknown): value is ExamineeRole =>
  typeof value === 'string' && (EXAMINEE_ROLES as readonly string[]).includes(value);
