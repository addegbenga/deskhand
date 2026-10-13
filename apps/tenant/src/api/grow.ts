import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CampaignCheckSchema,
  CampaignListSchema,
  CampaignSchema,
  FormListSchema,
  FormResponseListSchema,
  FormSchema,
  PaymentLinkListSchema,
  PaymentLinkSchema,
  PaymentListSchema,
  PaymentsOverviewSchema,
  MessageTemplateSchema,
  PlannerListSchema,
  PlannerPostSchema,
  RecipeListSchema,
  RecipePackListSchema,
  RecipeSchema,
  RecipeTestResultSchema,
  ReviewInsightsSchema,
  ReviewListSchema,
  ReviewRecordSchema,
  ReviewSettingsSchema,
  TrackLinkListSchema,
  TrackLinkSchema,
  WorkflowRunListSchema,
  type FormWrite,
  type RecipeWrite,
} from '@deskhand/schemas'
import { api } from './client'

export function useRecipes() {
  return useQuery({ queryKey: ['recipes'], queryFn: ({ signal }) => api('/recipes', { schema: RecipeListSchema, signal }) })
}
export function useRecipePacks() {
  return useQuery({
    queryKey: ['recipe-packs'],
    queryFn: ({ signal }) => api('/recipe-packs', { schema: RecipePackListSchema, signal }),
  })
}
export function useCreateRecipe() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: RecipeWrite) => api('/recipes', { method: 'POST', body, schema: RecipeSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['recipes'] }),
  })
}
export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipes', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/recipes/${id}`, { schema: RecipeSchema, signal }),
  })
}
export function usePatchRecipe(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/recipes/${id}`, { method: 'PATCH', body, schema: RecipeSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['recipes'] }),
  })
}
export function useRecipeRuns(id: string | undefined) {
  return useQuery({
    queryKey: ['recipes', id, 'runs'],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/recipes/${id}/runs`, { schema: WorkflowRunListSchema, signal }),
  })
}
export function useTestRecipe(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) =>
      api(`/recipes/${id}/test`, { method: 'POST', body: { contactId }, schema: RecipeTestResultSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function usePlanner() {
  return useQuery({ queryKey: ['planner'], queryFn: ({ signal }) => api('/planner', { schema: PlannerListSchema, signal }) })
}
export function useApprovePost() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/planner/${id}/approve`, { method: 'POST', schema: PlannerPostSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['planner'] }),
  })
}
export function usePatchPost() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; caption?: string; status?: 'draft' | 'approved' | 'scheduled' | 'published'; scheduledFor?: string | null }) =>
      api(`/planner/${id}`, { method: 'PATCH', body, schema: PlannerPostSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['planner'] }),
  })
}

export function useCampaigns() {
  return useQuery({ queryKey: ['campaigns'], queryFn: ({ signal }) => api('/campaigns', { schema: CampaignListSchema, signal }) })
}
export function useCreateCampaign() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; channel: 'whatsapp' | 'email'; templateId: string; listId?: string | null }) =>
      api('/campaigns', { method: 'POST', body, schema: CampaignSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}
export function useCheckCampaign() {
  return useMutation({
    mutationFn: (id: string) => api(`/campaigns/${id}/check`, { method: 'POST', schema: CampaignCheckSchema }),
  })
}
export function useSendCampaign() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/campaigns/${id}/send`, { method: 'POST', schema: CampaignSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function usePatchTemplate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, body }: { id: string; status?: 'pending' | 'approved'; body?: string }) =>
      api(`/templates/${id}`, { method: 'PATCH', body: { status, body }, schema: MessageTemplateSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['templates'] }),
  })
}
export function useCreateTemplate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; channel: 'whatsapp' | 'email'; body: string; language?: string }) =>
      api('/templates', { method: 'POST', body, schema: MessageTemplateSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useTrackLinks() {
  return useQuery({ queryKey: ['links'], queryFn: ({ signal }) => api('/links', { schema: TrackLinkListSchema, signal }) })
}
export function useCreateLink() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (label: string) => api('/links', { method: 'POST', body: { label }, schema: TrackLinkSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['links'] }),
  })
}

export function useReviews() {
  return useQuery({ queryKey: ['reviews'], queryFn: ({ signal }) => api('/reviews', { schema: ReviewListSchema, signal }) })
}
export function useReplyReview() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      api(`/reviews/${id}/reply`, { method: 'POST', body: { reply }, schema: ReviewRecordSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['reviews'] }),
  })
}
export function useReviewSettings() {
  return useQuery({ queryKey: ['reviews', 'settings'], queryFn: ({ signal }) => api('/review-settings', { schema: ReviewSettingsSchema, signal }) })
}
export function usePatchReviewSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/review-settings', { method: 'PATCH', body, schema: ReviewSettingsSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['reviews'] }),
  })
}
export function useReviewInsights() {
  return useQuery({ queryKey: ['reviews', 'insights'], queryFn: ({ signal }) => api('/review-insights', { schema: ReviewInsightsSchema, signal }) })
}

export function usePayments() {
  return useQuery({ queryKey: ['payments'], queryFn: ({ signal }) => api('/payments', { schema: PaymentListSchema, signal }) })
}
export function usePaymentsOverview() {
  return useQuery({ queryKey: ['payments', 'overview'], queryFn: ({ signal }) => api('/payments/overview', { schema: PaymentsOverviewSchema, signal }) })
}
export function usePaymentLinks() {
  return useQuery({ queryKey: ['payments', 'links'], queryFn: ({ signal }) => api('/payment-links', { schema: PaymentLinkListSchema, signal }) })
}
export function useCreatePaymentLink() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { contactName: string; amount: number; purpose: 'service' | 'deposit' | 'custom' }) =>
      api('/payment-links', { method: 'POST', body, schema: PaymentLinkSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['payments'] }),
  })
}

export function useForms() {
  return useQuery({ queryKey: ['forms'], queryFn: ({ signal }) => api('/forms', { schema: FormListSchema, signal }) })
}
export function useForm(id: string | undefined) {
  return useQuery({
    queryKey: ['forms', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/forms/${id}`, { schema: FormSchema, signal }),
  })
}
export function useCreateForm() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api('/forms', { method: 'POST', body: { name }, schema: FormSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['forms'] }),
  })
}
export function usePatchForm(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<FormWrite>) => api(`/forms/${id}`, { method: 'PATCH', body, schema: FormSchema }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['forms'] }),
  })
}
export function useFormResponses(id: string | undefined) {
  return useQuery({
    queryKey: ['forms', id, 'responses'],
    enabled: Boolean(id),
    queryFn: ({ signal }) => api(`/forms/${id}/responses`, { schema: FormResponseListSchema, signal }),
  })
}
