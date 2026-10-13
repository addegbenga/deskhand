import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AccessReviewSchema,
  AiGovernanceSchema,
  AuditEventListSchema,
  ComplianceOverviewSchema,
  ConsentCenterSchema,
  DataGovernanceSchema,
  DisclosureCenterSchema,
  DsarPreviewSchema,
  DsarQueueSchema,
  LegalCenterSchema,
  RecordingCenterSchema,
} from '@deskhand/schemas'
import { api } from './client'

export function useComplianceOverview(market?: string) {
  const q = market ? `?market=${market}` : ''
  return useQuery({
    queryKey: ['compliance', 'overview', market ?? 'account'],
    queryFn: ({ signal }) => api(`/compliance/overview${q}`, { schema: ComplianceOverviewSchema, signal }),
  })
}

export function useDisclosure() {
  return useQuery({
    queryKey: ['compliance', 'disclosure'],
    queryFn: ({ signal }) => api('/compliance/disclosure', { schema: DisclosureCenterSchema, signal }),
  })
}

export function usePatchDisclosure() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/compliance/disclosure', { method: 'PATCH', body, schema: DisclosureCenterSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useVerifyDisclosure() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/compliance/disclosure/verify', { method: 'POST', body, schema: DisclosureCenterSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useConsent(q: string) {
  return useQuery({
    queryKey: ['compliance', 'consent', q],
    queryFn: ({ signal }) => api(`/compliance/consent?q=${encodeURIComponent(q)}`, { schema: ConsentCenterSchema, signal }),
  })
}

export function useReconsent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/compliance/consent/reconsent', { method: 'POST', body, schema: ConsentCenterSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useAddSuppression() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/compliance/consent/suppression', { method: 'POST', body, schema: ConsentCenterSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useRecording() {
  return useQuery({
    queryKey: ['compliance', 'recording'],
    queryFn: ({ signal }) => api('/compliance/recording', { schema: RecordingCenterSchema, signal }),
  })
}

export function usePatchRecording() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/compliance/recording', { method: 'PATCH', body, schema: RecordingCenterSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useDataGov() {
  return useQuery({
    queryKey: ['compliance', 'data'],
    queryFn: ({ signal }) => api('/compliance/data', { schema: DataGovernanceSchema, signal }),
  })
}

export function usePatchDataGov() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/compliance/data', { method: 'PATCH', body, schema: DataGovernanceSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useDsarQueue(market?: string) {
  const q = market ? `?market=${market}` : ''
  return useQuery({
    queryKey: ['compliance', 'requests', market ?? 'account'],
    queryFn: ({ signal }) => api(`/compliance/requests${q}`, { schema: DsarQueueSchema, signal }),
  })
}

export function useLogDsar() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/compliance/requests', { method: 'POST', body, schema: DsarQueueSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function usePatchDsar() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/compliance/requests/${id}`, { method: 'PATCH', body, schema: DsarQueueSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useDsarPreview(id: string | null) {
  return useQuery({
    queryKey: ['compliance', 'preview', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/compliance/requests/${id}/preview`, { schema: DsarPreviewSchema, signal }),
  })
}

export function useAiGov() {
  return useQuery({
    queryKey: ['compliance', 'ai'],
    queryFn: ({ signal }) => api('/compliance/ai', { schema: AiGovernanceSchema, signal }),
  })
}

export function useAcceptProhibited() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api('/compliance/ai/prohibited', { method: 'POST', schema: AiGovernanceSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useReportIncident() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/compliance/ai/incidents', { method: 'POST', body, schema: AiGovernanceSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useComplianceAudit(q: string) {
  return useQuery({
    queryKey: ['compliance', 'audit', q],
    queryFn: ({ signal }) => api(`/compliance/audit?q=${encodeURIComponent(q)}`, { schema: AuditEventListSchema, signal }),
  })
}

export function useAccessReview() {
  return useQuery({
    queryKey: ['compliance', 'access'],
    queryFn: ({ signal }) => api('/compliance/access', { schema: AccessReviewSchema, signal }),
  })
}

export function useSupportDecision() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'deny' }) =>
      api(`/compliance/access/support/${id}`, { method: 'POST', body: { decision }, schema: AccessReviewSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}

export function useLegalCenter() {
  return useQuery({
    queryKey: ['compliance', 'legal'],
    queryFn: ({ signal }) => api('/compliance/legal', { schema: LegalCenterSchema, signal }),
  })
}

export function useAcceptLegal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api('/compliance/legal/accept', { method: 'POST', body: { id }, schema: LegalCenterSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['compliance'] }),
  })
}
