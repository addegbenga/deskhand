import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DigestSettingsSchema,
  PageVersionListSchema,
  ReportExportSchema,
  ReportViewSchema,
  SitePageListSchema,
  SitePageSchema,
  type ReportId,
  type ReportRange,
} from '@deskhand/schemas'
import { api } from './client'

export function useReport(id: ReportId, range: ReportRange, locationId: string | null) {
  return useQuery({
    queryKey: ['reports', id, range, locationId],
    queryFn: ({ signal }) =>
      api(`/reports/${id}`, { schema: ReportViewSchema, query: { range, locationId }, signal }),
  })
}

export function useExportReport() {
  return useMutation({
    mutationFn: ({ id, range, locationId }: { id: ReportId; range: ReportRange; locationId: string | null }) =>
      api(`/reports/${id}/export`, { schema: ReportExportSchema, query: { range, locationId } }),
  })
}

export function useDigest() {
  return useQuery({
    queryKey: ['reports', 'digest'],
    queryFn: ({ signal }) => api('/reports/digest', { schema: DigestSettingsSchema, signal }),
  })
}

export function usePatchDigest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/reports/digest', { method: 'PATCH', body, schema: DigestSettingsSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['reports', 'digest'] }),
  })
}

export function usePages() {
  return useQuery({ queryKey: ['pages'], queryFn: ({ signal }) => api('/pages', { schema: SitePageListSchema, signal }) })
}

export function usePage(id: string | undefined) {
  return useQuery({
    queryKey: ['pages', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/pages/${id}`, { schema: SitePageSchema, signal }),
  })
}

export function useCreatePage() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { title?: string; template?: 'salon' | 'blank'; prompt?: string }) =>
      api('/pages', { method: 'POST', body, schema: SitePageSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['pages'] }),
  })
}

export function usePatchPage(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/pages/${id}`, { method: 'PATCH', body, schema: SitePageSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['pages'] }),
  })
}

export function usePublishPage(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { seoTitle: string; seoDescription: string; indexable: boolean; domain: string | null }) =>
      api(`/pages/${id}/publish`, { method: 'POST', body, schema: SitePageSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['pages'] }),
  })
}

export function useUnpublishPage() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/pages/${id}/unpublish`, { method: 'POST', schema: SitePageSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['pages'] }),
  })
}

export function usePageVersions(id: string | undefined) {
  return useQuery({
    queryKey: ['pages', id, 'versions'],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/pages/${id}/versions`, { schema: PageVersionListSchema, signal }),
  })
}

export function useRestorePage(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (versionId: string) => api(`/pages/${id}/restore/${versionId}`, { method: 'POST', schema: SitePageSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['pages'] }),
  })
}
