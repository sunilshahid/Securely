export interface Bin {
  binId: string;
  encryptedTextBlob: string;
  encryptedFileBlob: string | null;
  ivText: string;
  ivFile: string | null;
  isPasswordProtected: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface SecurityLog {
  id: string;
  ip: string;
  timestamp: string;
}

export interface AdminStats {
  totalBinsAllTime: number;
  activeBins: number;
  storageSize: number;
  serverUptime: number;
  securityLogs: SecurityLog[];
}

export interface ApiKey {
  id: string;
  label: string;
  rateLimitQuota: number;
  isActive: boolean;
  createdAt: string;
  requestCount?: number;
}
