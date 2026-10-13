import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  BulkConversationActionSchema,
  AiMemoryItemSchema,
  CompanyDetailSchema,
  CompanyListSchema,
  CompanySchema,
  ContactDetailSchema,
  ContactPageSchema,
  ContactSchema,
  SmartListListSchema,
  SmartListSchema,
  ConversationPageSchema,
  ConversationSchema,
  ConversationThreadSchema,
  CustomFieldListSchema,
  DuplicateListSchema,
  HomeDashboardSchema,
  ImportJobSchema,
  ImportPreviewSchema,
  MessageSchema,
  SavedReplyListSchema,
  TeamMemberListSchema,
  TemplateListSchema,
  TranslatePreviewSchema,
  type ContactConsentWrite,
  type ContactWrite,
  type SmartListWrite,
  type ConversationPatch,
  type InboxView,
  type SendMessage,
} from '@deskhand/schemas'
import { api } from './client'

export function useHome(locationId: string | null, range: string) {
  return useQuery({
    queryKey: ['home', locationId, range],
    queryFn: ({ signal }) => api('/home', { schema: HomeDashboardSchema, query: { locationId, range }, signal }),
    refetchInterval: 15_000,
  })
}

export function useDismissSuggestion() {
  return useMutation({
    mutationFn: (id: string) => api(`/home/suggestions/${id}/dismiss`, { method: 'POST' }),
  })
}

export function useAcceptSuggestion() {
  return useMutation({
    mutationFn: (id: string) => api(`/home/suggestions/${id}/accept`, { method: 'POST' }),
  })
}

export function useConversations(params: {
  view: InboxView
  q: string
  channel?: string
  assignedUserId?: string
  tag?: string
  stage?: string
  language?: string
  since?: string
  locationId: string | null
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['conversations', params],
    enabled: params.enabled ?? true,
    queryFn: ({ signal }) =>
      api('/conversations', {
        schema: ConversationPageSchema,
        query: {
          view: params.view,
          q: params.q,
          channel: params.channel,
          assignedUserId: params.assignedUserId,
          tag: params.tag,
          stage: params.stage,
          language: params.language,
          since: params.since,
          locationId: params.locationId,
        },
        signal,
      }),
    refetchInterval: params.enabled === false ? false : 10_000,
  })
}

export function useThread(id: string | undefined) {
  return useQuery({
    queryKey: ['conversations', id, 'thread'],
    queryFn: ({ signal }) => api(`/conversations/${id}`, { schema: ConversationThreadSchema, signal }),
    enabled: Boolean(id),
  })
}

export function usePatchConversation(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: ConversationPatch) => api(`/conversations/${id}`, { method: 'PATCH', body: patch, schema: ConversationSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['conversations'] }),
  })
}

export function useSendMessage(id: string) {
  return useMutation({
    mutationFn: (body: SendMessage) => api(`/conversations/${id}/messages`, { method: 'POST', body, schema: MessageSchema }),
  })
}

export function useAcceptDraft(id: string) {
  return useMutation({
    mutationFn: (body: SendMessage) => api(`/conversations/${id}/draft/accept`, { method: 'POST', body, schema: MessageSchema }),
  })
}

export function useDiscardDraft(id: string) {
  return useMutation({
    mutationFn: () => api(`/conversations/${id}/draft/discard`, { method: 'POST' }),
  })
}

export function useRateMessage() {
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: 'good' | 'bad' }) =>
      api(`/messages/${id}/rate`, { method: 'POST', body: { rating }, schema: MessageSchema }),
  })
}

export function useBulkConversations() {
  return useMutation({
    mutationFn: (body: z.infer<typeof BulkConversationActionSchema>) => api('/conversations/bulk', { method: 'POST', body }),
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: ({ signal }) => api('/templates', { schema: TemplateListSchema, signal }),
  })
}

export function useSavedReplies() {
  return useQuery({
    queryKey: ['saved-replies'],
    queryFn: ({ signal }) => api('/saved-replies', { schema: SavedReplyListSchema, signal }),
  })
}

export function useTeamOptions() {
  return useQuery({
    queryKey: ['team-options'],
    queryFn: ({ signal }) => api('/team/options', { schema: TeamMemberListSchema, signal }),
  })
}

export function useTranslate() {
  return useMutation({
    mutationFn: (body: { text: string; to: string }) => api('/translate', { method: 'POST', body, schema: TranslatePreviewSchema }),
  })
}

export function useTestMessage() {
  return useMutation({
    mutationFn: () => api('/inbox/test-message', { method: 'POST', schema: z.object({ conversationId: z.string() }) }),
  })
}

export function useContacts(params: {
  q: string
  tag?: string
  source?: string
  stage?: string
  fieldKey?: string
  fieldValue?: string
  since?: string
  companyId?: string
  listId?: string
  locationId: string | null
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['contacts', params],
    enabled: params.enabled ?? true,
    queryFn: ({ signal }) =>
      api('/contacts', {
        schema: ContactPageSchema,
        query: {
          q: params.q,
          tag: params.tag,
          source: params.source,
          stage: params.stage,
          fieldKey: params.fieldKey,
          fieldValue: params.fieldValue,
          since: params.since,
          companyId: params.companyId,
          listId: params.listId,
          locationId: params.locationId,
        },
        signal,
      }),
  })
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: ({ signal }) => api(`/contacts/${id}`, { schema: ContactDetailSchema, signal }),
    enabled: Boolean(id),
  })
}

export function useCreateContact() {
  return useMutation({
    mutationFn: (body: ContactWrite) => api('/contacts', { method: 'POST', body, schema: ContactSchema }),
  })
}

export function usePatchContact(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<ContactWrite>) => api(`/contacts/${id}`, { method: 'PATCH', body, schema: ContactSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useRecordConsent(contactId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ContactConsentWrite) =>
      api(`/contacts/${contactId}/consent`, { method: 'POST', body, schema: ContactSchema }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['conversations'] }),
        client.invalidateQueries({ queryKey: ['contacts'] }),
      ])
    },
  })
}

export function useDuplicates() {
  return useQuery({
    queryKey: ['duplicates'],
    queryFn: ({ signal }) => api('/duplicates', { schema: DuplicateListSchema, signal }),
  })
}

export function useMergeContacts() {
  return useMutation({
    mutationFn: (body: { winnerId: string; loserId: string }) => api('/contacts/merge', { method: 'POST', body, schema: ContactSchema }),
  })
}

export function useImportPreview() {
  return useMutation({
    mutationFn: (csv: string) => api('/imports/preview', { method: 'POST', body: { csv }, schema: ImportPreviewSchema }),
  })
}

export function useRunImport() {
  return useMutation({
    mutationFn: (body: { csv: string; attested: true }) => api('/imports', { method: 'POST', body: { ...body, mapping: {} }, schema: ImportJobSchema }),
  })
}

export function useUndoImport() {
  return useMutation({
    mutationFn: (id: string) => api(`/imports/${id}/undo`, { method: 'POST' }),
  })
}

export function useCustomFields() {
  return useQuery({
    queryKey: ['custom-fields'],
    queryFn: ({ signal }) => api('/custom-fields', { schema: CustomFieldListSchema, signal }),
  })
}

export function useAddNote(contactId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api(`/contacts/${contactId}/notes`, { method: 'POST', body: { body } }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['contacts', contactId] }),
  })
}

export function useDeleteMemory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/memories/${id}`, { method: 'DELETE' }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function usePatchMemory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; value: string }) =>
      api(`/memories/${input.id}`, { method: 'PATCH', body: { value: input.value }, schema: AiMemoryItemSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useBulkDeleteContacts() {
  return useMutation({
    mutationFn: (body: { ids: string[]; confirm: string }) => api('/contacts/bulk-delete', { method: 'POST', body }),
  })
}

export function useBulkTagContacts() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { ids: string[]; tag: string }) => api('/contacts/bulk-tag', { method: 'POST', body }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useBulkCompanyContacts() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { ids: string[]; companyId: string | null }) => api('/contacts/bulk-company', { method: 'POST', body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['contacts'] })
      void client.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useSmartLists() {
  return useQuery({
    queryKey: ['smart-lists'],
    queryFn: ({ signal }) => api('/smart-lists', { schema: SmartListListSchema, signal }),
  })
}

export function useCreateSmartList() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: SmartListWrite) => api('/smart-lists', { method: 'POST', body, schema: SmartListSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['smart-lists'] }),
  })
}

export function useDeleteSmartList() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/smart-lists/${id}`, { method: 'DELETE' }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['smart-lists'] }),
  })
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: ({ signal }) => api('/companies', { schema: CompanyListSchema, signal }),
  })
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: ({ signal }) => api(`/companies/${id}`, { schema: CompanyDetailSchema, signal }),
    enabled: Boolean(id),
  })
}

export function useCreateCompany() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; notes?: string }) => api('/companies', { method: 'POST', body, schema: CompanySchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['companies'] }),
  })
}

export function usePatchCompany(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name?: string; notes?: string }) => api(`/companies/${id}`, { method: 'PATCH', body, schema: CompanySchema }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['companies'] })
      void client.invalidateQueries({ queryKey: ['companies', id] })
    },
  })
}

export function useDeleteCompany() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/companies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['companies'] })
      void client.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useExportContacts(locationId: string | null) {
  return useMutation({
    mutationFn: () => api('/exports/contacts', { query: { locationId }, schema: z.object({ csv: z.string(), count: z.number() }) }),
  })
}
