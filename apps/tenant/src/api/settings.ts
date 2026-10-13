import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiKeyListSchema,
  AuditEventListSchema,
  BillingOverviewSchema,
  BrandingSettingsSchema,
  BulkInviteResultSchema,
  WorkspaceProfileSchema,
  ConnectionEventListSchema,
  ConnectionHubSchema,
  ConnectionTestSchema,
  DataExportSchema,
  InvoiceListSchema,
  JoinLinkSchema,
  JoinRequestListSchema,
  LanguageMarketSchema,
  NotificationPrefsSchema,
  DeviceSessionListSchema,
  SecuritySettingsSchema,
  TeamInvitationListSchema,
  WorkspaceMemberListSchema,
  UsageReportSchema,
  WebhookLogListSchema,
} from '@deskhand/schemas'
import { api } from './client'

export function useBusiness() {
  return useQuery({ queryKey: ['settings', 'business'], queryFn: ({ signal }) => api('/settings/business', { schema: WorkspaceProfileSchema, signal }) })
}
export function usePatchBusiness() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/settings/business', { method: 'PATCH', body, schema: WorkspaceProfileSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['settings'] }),
  })
}
export function useBranding() {
  return useQuery({ queryKey: ['settings', 'branding'], queryFn: ({ signal }) => api('/settings/branding', { schema: BrandingSettingsSchema, signal }) })
}
export function usePatchBranding() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/settings/branding', { method: 'PATCH', body, schema: BrandingSettingsSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['settings'] }),
  })
}
export function useNotificationPrefs() {
  return useQuery({ queryKey: ['settings', 'notifications'], queryFn: ({ signal }) => api('/settings/notifications', { schema: NotificationPrefsSchema, signal }) })
}
export function usePatchNotifications() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/settings/notifications', { method: 'PATCH', body, schema: NotificationPrefsSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['settings'] }),
  })
}
export function useLanguages() {
  return useQuery({ queryKey: ['settings', 'languages'], queryFn: ({ signal }) => api('/settings/languages', { schema: LanguageMarketSchema, signal }) })
}
export function useConnections() {
  return useQuery({ queryKey: ['connections'], queryFn: ({ signal }) => api('/connections', { schema: ConnectionHubSchema, signal }) })
}
export function useConnectionEvents(enabled = true) {
  return useQuery({
    queryKey: ['connections', 'events'],
    queryFn: ({ signal }) => api('/connections/events', { schema: ConnectionEventListSchema, signal }),
    enabled,
  })
}
export function useConnectionAction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, action }: { kind: string; action: 'connect' | 'test' | 'fix' | 'disconnect' }) =>
      api(`/connections/${kind}/${action}`, { method: 'POST', schema: ConnectionTestSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['connections'] }),
  })
}
export function useTeam() {
  return useQuery({ queryKey: ['team', 'members'], queryFn: ({ signal }) => api('/team/members', { schema: WorkspaceMemberListSchema, signal }) })
}
export function useInvitations() {
  return useQuery({ queryKey: ['team', 'invitations'], queryFn: ({ signal }) => api('/team/invitations', { schema: TeamInvitationListSchema, signal }) })
}
export function useInvite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/team/invites', { method: 'POST', body, schema: BulkInviteResultSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['team'] }),
  })
}
export function useInvitationAction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resend' | 'revoke' }) =>
      api(`/team/invitations/${id}/${action}`, { method: 'POST', schema: BulkInviteResultSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['team'] }),
  })
}
export function useJoinRequests() {
  return useQuery({ queryKey: ['team', 'requests'], queryFn: ({ signal }) => api('/team/join-requests', { schema: JoinRequestListSchema, signal }) })
}
export function useApproveJoin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/team/join-requests/${id}/approve`, { method: 'POST', schema: JoinRequestListSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['team'] }),
  })
}
export function useCreateJoinLink() {
  return useMutation({
    mutationFn: (role: string) => api('/team/join-links', { method: 'POST', body: { role }, schema: JoinLinkSchema }),
  })
}
export function useOffboard() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reassignToUserId, confirmation }: { id: string; reassignToUserId: string; confirmation: string }) =>
      api(`/team/${id}/offboard`, { method: 'POST', body: { reassignToUserId, confirmation }, schema: WorkspaceMemberListSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['team'] }),
  })
}
export function useBilling() {
  return useQuery({ queryKey: ['billing'], queryFn: ({ signal }) => api('/billing', { schema: BillingOverviewSchema, signal }) })
}
export function useInvoices() {
  return useQuery({ queryKey: ['billing', 'invoices'], queryFn: ({ signal }) => api('/billing/invoices', { schema: InvoiceListSchema, signal }) })
}
export function useChangePlan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (plan: string) => api('/billing/plan', { method: 'POST', body: { plan }, schema: BillingOverviewSchema }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['billing'] })
      void client.invalidateQueries({ queryKey: ['session'] })
      void client.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}
export function useCancelPlan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/billing/cancel', { method: 'POST', body, schema: BillingOverviewSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['session'] }),
  })
}
export function useUsage() {
  return useQuery({ queryKey: ['usage'], queryFn: ({ signal }) => api('/usage', { schema: UsageReportSchema, signal }) })
}
export function usePatchUsage() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/usage', { method: 'PATCH', body, schema: UsageReportSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['usage'] }),
  })
}
export function useSimulateUsage() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api('/usage/simulate', { method: 'POST', schema: UsageReportSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['usage'] }),
  })
}
export function useSecurity() {
  return useQuery({ queryKey: ['settings', 'security'], queryFn: ({ signal }) => api('/security', { schema: SecuritySettingsSchema, signal }) })
}
export function useRevokeSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/security/sessions/${id}/revoke`, { method: 'POST', schema: DeviceSessionListSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['settings', 'security'] }),
  })
}
export function useExportData() {
  return useMutation({
    mutationFn: (include: string[]) => api('/data/export', { method: 'POST', body: { include }, schema: DataExportSchema }),
  })
}
export function useCloseAccount() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/account/close', { method: 'POST', body, schema: BillingOverviewSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['session'] }),
  })
}
export function useAudit(q: string) {
  return useQuery({
    queryKey: ['settings', 'audit', q],
    queryFn: ({ signal }) => api('/audit', { schema: AuditEventListSchema, query: { q }, signal }),
  })
}
export function useApiKeys() {
  return useQuery({ queryKey: ['settings', 'api'], queryFn: ({ signal }) => api('/settings/api-keys', { schema: ApiKeyListSchema, signal }) })
}
export function useWebhooks() {
  return useQuery({ queryKey: ['settings', 'webhooks'], queryFn: ({ signal }) => api('/settings/webhooks', { schema: WebhookLogListSchema, signal }) })
}
