import { api } from './api';

export type AdminPaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type AdminPaginated<T> = {
  items: T[];
  meta: AdminPaginationMeta;
};

export type AdminOverview = {
  totalUsers: number;
  buyers: number;
  sellers: number;
  verifiedUsers: number;
  activeRequests: number;
  offersSent: number;
  openChats: number;
  messagesSent: number;
  pendingReports: number;
  blockedUsers: number;
  suspendedUsers: number;
  hiddenRequests: number;
  hiddenOffers: number;
  reviewRequiredContent: number;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'BUYER' | 'SELLER' | 'BOTH' | 'ADMIN';
  country: 'AR' | 'US';
  city?: string | null;
  businessName?: string | null;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  blocked: boolean;
  blockedAt?: string | null;
  blockedReason?: string | null;
  suspended: boolean;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  createdAt: string;
};

export type AdminRequest = {
  id: string;
  title: string;
  category: 'AUTOS' | 'INMOBILIARIA';
  operation: 'COMPRA' | 'ALQUILER';
  budget: number;
  currency: 'ARS' | 'USD';
  location: string;
  country: 'AR' | 'US';
  active: boolean;
  status: 'ACTIVA' | 'NEGOCIANDO' | 'CERRADA';
  createdAt: string;
  user: { id: string; name: string; email: string };
  _count: { offers: number };
};

export type AdminOffer = {
  id: string;
  price: number;
  currency: 'ARS' | 'USD';
  message: string;
  status: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
  requestTitle: string;
  createdAt: string;
  seller: { id: string; name: string; email: string };
  request: { id: string; title: string; country: 'AR' | 'US' } | null;
  chat: { id: string } | null;
};

export type AdminChat = {
  id: string;
  createdAt: string;
  requestTitle: string;
  seller: { id: string; name: string };
  buyer: { id: string; name: string };
  messageCount: number;
  lastMessage: { text: string; createdAt: string; fromRole: string } | null;
};

export type AdminChatMessage = { id: string; fromRole: string; text: string; createdAt: string };

export type AdminChatDetail = {
  id: string;
  createdAt: string;
  offer: {
    id: string;
    requestTitle: string;
    price: number;
    currency: 'ARS' | 'USD';
    status: string;
    seller: { id: string; name: string; email: string };
    request: { id: string; title: string; user: { id: string; name: string; email: string } };
  };
  messages: AdminPaginated<AdminChatMessage>;
};

export type ReportReason =
  | 'SPAM'
  | 'SCAM'
  | 'INAPPROPRIATE_CONTENT'
  | 'FAKE_OFFER'
  | 'ABUSIVE_BEHAVIOR'
  | 'OTHER';

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export type AdminReport = {
  id: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  weight: number;
  resolvedByAdmin: boolean;
  autoTriggeredAction?: string | null;
  reporterIp?: string | null;
  requestId?: string | null;
  offerId?: string | null;
  chatId?: string | null;
  messageId?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reporter: { id: string; name: string; email: string };
  reportedUser?: { id: string; name: string; email: string } | null;
  reviewedBy?: { id: string; name: string } | null;
};

export type AdminModerationDashboard = {
  hiddenRequests: {
    id: string;
    title: string;
    country: 'AR' | 'US';
    moderationReviewRequired: boolean;
    user: { id: string; name: string; email: string };
  }[];
  hiddenOffers: {
    id: string;
    requestTitle: string;
    price: number;
    currency: 'ARS' | 'USD';
    seller: { id: string; name: string; email: string };
  }[];
  suspendedUsers: {
    id: string;
    name: string;
    email: string;
    suspendedAt?: string | null;
    suspendedReason?: string | null;
  }[];
  topReportedContent: {
    type: 'request' | 'offer';
    id: string;
    title: string;
    uniqueReports: number;
  }[];
  topReportedUsers: {
    id: string;
    name: string;
    email: string;
    suspended: boolean;
    blocked: boolean;
    uniqueReports: number;
    highPriority: boolean;
    suspendThreshold: boolean;
  }[];
  topReporters: { id: string; name: string; email: string; reportsSent: number }[];
  priorityAlerts: {
    id: string;
    name: string;
    email: string;
    uniqueReports: number;
  }[];
};

export type AdminSecurityLog = {
  id: string;
  event: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const adminApi = {
  overview: () => api<AdminOverview>('/admin/overview'),

  users: (params: Record<string, string | number | boolean | undefined>) =>
    api<AdminPaginated<AdminUser>>(`/admin/users${qs(params)}`),
  blockUser: (id: string, reason?: string) =>
    api<AdminUser>(`/admin/users/${id}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  unblockUser: (id: string) =>
    api<AdminUser>(`/admin/users/${id}/unblock`, { method: 'PATCH' }),
  verifyUserEmail: (id: string) =>
    api<AdminUser>(`/admin/users/${id}/verify-email`, { method: 'PATCH' }),
  unsuspendUser: (id: string) =>
    api<AdminUser>(`/admin/users/${id}/unsuspend`, { method: 'PATCH' }),

  requests: (params: Record<string, string | number | boolean | undefined>) =>
    api<AdminPaginated<AdminRequest>>(`/admin/requests${qs(params)}`),
  closeRequest: (id: string) =>
    api(`/admin/requests/${id}/close`, { method: 'PATCH' }),
  reactivateRequest: (id: string) =>
    api(`/admin/requests/${id}/reactivate`, { method: 'PATCH' }),
  restoreRequest: (id: string) =>
    api(`/admin/requests/${id}/restore`, { method: 'PATCH' }),
  deleteRequest: (id: string) => api(`/admin/requests/${id}`, { method: 'DELETE' }),

  offers: (params: Record<string, string | number | boolean | undefined>) =>
    api<AdminPaginated<AdminOffer>>(`/admin/offers${qs(params)}`),
  restoreOffer: (id: string) =>
    api(`/admin/offers/${id}/restore`, { method: 'PATCH' }),
  deleteOffer: (id: string) => api(`/admin/offers/${id}`, { method: 'DELETE' }),

  moderation: () => api<AdminModerationDashboard>('/admin/moderation'),

  chats: (params: Record<string, string | number | boolean | undefined>) =>
    api<AdminPaginated<AdminChat>>(`/admin/chats${qs(params)}`),
  chat: (id: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    api<AdminChatDetail>(`/admin/chats/${id}${qs(params)}`),
  deleteMessage: (id: string) => api(`/admin/messages/${id}`, { method: 'DELETE' }),

  reports: (params: Record<string, string | number | boolean | undefined>) =>
    api<AdminPaginated<AdminReport>>(`/admin/reports${qs(params)}`),
  updateReportStatus: (id: string, status: ReportStatus) =>
    api<AdminReport>(`/admin/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  securityLogs: (params: Record<string, string | number | boolean | undefined>) =>
    api<AdminPaginated<AdminSecurityLog>>(`/admin/security-logs${qs(params)}`),
};

export type CreateReportInput = {
  reason: ReportReason;
  details?: string;
  reportedUserId?: string;
  requestId?: string;
  offerId?: string;
  chatId?: string;
  messageId?: string;
};

export function createReport(input: CreateReportInput) {
  return api<{ id: string; status: ReportStatus; createdAt: string }>('/reports', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export const REPORT_REASONS: ReportReason[] = [
  'SPAM',
  'SCAM',
  'INAPPROPRIATE_CONTENT',
  'FAKE_OFFER',
  'ABUSIVE_BEHAVIOR',
  'OTHER',
];
