import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApprovalQueueSchema,
  ApprovalSchema,
  ComplianceReportSchema,
  EmployeeListSchema,
  EmployeeSchema,
  EmployeeVersionSchema,
  EvalListSchema,
  KnowledgeItemSchema,
  KnowledgeListSchema,
  KnowledgePreviewSchema,
  type KnowledgeCollectionId,
  SandboxReplySchema,
  TrainingListSchema,
  TranscriptListSchema,
  TranscriptSampleSchema,
} from '@deskhand/schemas'
import { AiActionRecordSchema } from '@deskhand/schemas'
import { z } from 'zod'
import { api } from './client'

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: ({ signal }) => api('/employees', { schema: EmployeeListSchema, signal }),
  })
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/employees/${id}`, { schema: EmployeeSchema, signal }),
  })
}

export function useCreateEmployee() {
  return useMutation({
    mutationFn: (body: { kind: 'chat' | 'voice'; template: string; name: string }) =>
      api('/employees', { method: 'POST', body, schema: EmployeeSchema }),
  })
}

export function usePatchEmployee(id: string) {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/employees/${id}`, { method: 'PATCH', body, schema: EmployeeSchema }),
  })
}

export function useKillEmployee() {
  return useMutation({
    mutationFn: (id: string) => api(`/employees/${id}/kill`, { method: 'POST', schema: EmployeeSchema }),
  })
}

export function useResumeEmployee() {
  return useMutation({
    mutationFn: (id: string) => api(`/employees/${id}/resume`, { method: 'POST', schema: EmployeeSchema }),
  })
}

export function usePublishEmployee(id: string) {
  return useMutation({
    mutationFn: (rollout: 'shadow' | 'suggest' | 'approve' | 'autopilot') =>
      api(`/employees/${id}/publish`, { method: 'POST', body: { rollout }, schema: EmployeeSchema }),
  })
}

export function useDuplicateEmployee() {
  return useMutation({
    mutationFn: (id: string) => api(`/employees/${id}/duplicate`, { method: 'POST', schema: EmployeeSchema }),
  })
}

export function useEmployeeVersions(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id, 'versions'],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/employees/${id}/versions`, { schema: z.array(EmployeeVersionSchema), signal }),
  })
}

export function useRollback(id: string) {
  return useMutation({
    mutationFn: (number: number) => api(`/employees/${id}/versions/${number}/rollback`, { method: 'POST', schema: EmployeeSchema }),
  })
}

export function useSandbox(id: string) {
  return useMutation({
    mutationFn: (body: { message: string; scenario?: string; language?: string }) =>
      api(`/employees/${id}/sandbox`, { method: 'POST', body, schema: SandboxReplySchema }),
  })
}

export function useEvals(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id, 'evals'],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/employees/${id}/evals`, { schema: EvalListSchema, signal }),
  })
}

export function useCompliance(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id, 'compliance'],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/employees/${id}/compliance`, { schema: ComplianceReportSchema, signal }),
  })
}

export function useRaiseAutonomy(id: string) {
  return useMutation({
    mutationFn: (body: { toolId?: string; language?: string; autonomy: string; reason: string }) =>
      api(`/employees/${id}/autonomy`, { method: 'POST', body, schema: EmployeeSchema }),
  })
}

export function useKnowledge(collection?: string) {
  return useQuery({
    queryKey: ['knowledge', collection],
    queryFn: ({ signal }) => api('/knowledge', { schema: KnowledgeListSchema, query: { collection }, signal }),
  })
}

export function useAddKnowledge() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { collection: KnowledgeCollectionId; title: string; answer: string; containsPrice?: boolean }) =>
      api('/knowledge', { method: 'POST', body, schema: KnowledgeItemSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function usePatchKnowledge() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      title?: string
      answer?: string
      pinned?: Record<string, string>
      expiresAt?: string | null
    }) => api(`/knowledge/${id}`, { method: 'PATCH', body, schema: KnowledgeItemSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function useVerifyKnowledge() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/knowledge/${id}/verify`, { method: 'POST', schema: KnowledgeItemSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function useImportKnowledge() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { url?: string; paste?: string; fileName?: string; collection?: KnowledgeCollectionId }) =>
      api('/knowledge/import', { method: 'POST', body, schema: KnowledgeItemSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function useKnowledgePreview() {
  return useMutation({
    mutationFn: (body: { question: string; language?: string }) =>
      api('/knowledge/preview', { method: 'POST', body, schema: KnowledgePreviewSchema }),
  })
}

export function useTraining() {
  return useQuery({
    queryKey: ['training'],
    queryFn: ({ signal }) => api('/knowledge/training', { schema: TrainingListSchema, signal }),
  })
}

export function useAddTraining() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer?: string }) =>
      api(`/knowledge/training/${id}/add`, { method: 'POST', body: { answer }, schema: KnowledgeItemSchema }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['knowledge'] })
      void client.invalidateQueries({ queryKey: ['training'] })
    },
  })
}

export function useApprovals(status: string) {
  return useQuery({
    queryKey: ['approvals', status],
    queryFn: ({ signal }) => api('/approvals', { schema: ApprovalQueueSchema, query: { status }, signal }),
  })
}

function useInvalidateApprovals() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ['approvals'] })
    void client.invalidateQueries({ queryKey: ['nav-summary'] })
  }
}

export function useApprove() {
  const invalidate = useInvalidateApprovals()
  return useMutation({
    mutationFn: (input: { id: string; body?: string }) =>
      api(`/approvals/${input.id}/approve`, { method: 'POST', body: { body: input.body }, schema: ApprovalSchema }),
    onSuccess: invalidate,
  })
}

export function useRejectApproval() {
  const invalidate = useInvalidateApprovals()
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      api(`/approvals/${input.id}/reject`, { method: 'POST', body: { reason: input.reason }, schema: ApprovalSchema }),
    onSuccess: invalidate,
  })
}

export function useSnoozeApproval() {
  const invalidate = useInvalidateApprovals()
  return useMutation({
    mutationFn: (id: string) => api(`/approvals/${id}/snooze`, { method: 'POST', schema: ApprovalSchema }),
    onSuccess: invalidate,
  })
}

export function useBulkApprovals() {
  const invalidate = useInvalidateApprovals()
  return useMutation({
    mutationFn: (body: { ids: string[]; action: 'approve' | 'reject'; reason?: string }) =>
      api('/approvals/bulk', { method: 'POST', body, schema: ApprovalQueueSchema }),
    onSuccess: invalidate,
  })
}

export function useAiActivity(employeeId?: string) {
  return useQuery({
    queryKey: ['employees', 'activity', employeeId],
    queryFn: ({ signal }) => api('/ai-activity', { schema: z.array(AiActionRecordSchema), query: { employeeId }, signal }),
  })
}

export function useTranscripts() {
  return useQuery({
    queryKey: ['transcripts'],
    queryFn: ({ signal }) => api('/transcripts', { schema: TranscriptListSchema, signal }),
  })
}

export function useRateTranscript() {
  return useMutation({
    mutationFn: (input: { id: string; rating: 'good' | 'needs_fix' | 'harmful' }) =>
      api(`/transcripts/${input.id}/rate`, { method: 'POST', body: { rating: input.rating }, schema: TranscriptSampleSchema }),
  })
}
