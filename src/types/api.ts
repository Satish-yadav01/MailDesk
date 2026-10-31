/** Fields taken from the sample request body in the Postman collection. */
export interface EmailRecordInput {
  firstName?: string; lastName?: string; email: string; emailStatus?: string;
  jobTitle?: string; companyName?: string; companyDomain?: string; location?: string;
}

/** A record as displayed. Unknown extra fields returned by the API are preserved in `extra`. */
export interface EmailRecord {
  key: string;
  id: string | null;
  firstName: string | null; lastName: string | null; email: string | null; emailStatus: string | null;
  jobTitle: string | null; companyName: string | null; companyDomain: string | null; location: string | null;
  createdAt: string | null;
  extra: Record<string, unknown>;
}

export interface EmailPage {
  items: EmailRecord[];
  page: number;
  size: number;
  /** null when the API response does not say */
  totalElements: number | null;
  totalPages: number | null;
}

/** 202 response from add / import-excel. Only `tid` is confirmed by the collection. */
export interface AsyncSubmission { tid: string; raw: unknown }

export type TransactionOperation = 'single-email' | 'multiple-emails' | 'excel-import';

export interface TransactionStatus {
  tid: string;
  userId?: string | null;
  url?: string | null;
  operation?: string | null;
  status: string | null;
  statusCode: number | null;
  message: string | null;
  isTerminal: boolean;
  isFailure: boolean;
  raw: unknown;
}

export interface TransactionPage {
  items: TransactionStatus[];
  page: number;
  size: number;
  totalElements: number | null;
  totalPages: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ServiceHealth { ok: boolean; message: string | null }
export interface SimpleResult { message: string | null; raw: unknown }
