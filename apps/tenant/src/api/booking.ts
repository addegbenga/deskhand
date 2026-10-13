import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AppointmentSchema,
  BookingPageSettingsSchema,
  CalendarPayloadSchema,
  LeadListSchema,
  LeadSchema,
  LocationSchema,
  PipelineBoardSchema,
  ServiceListSchema,
  ServiceSchema,
  SlotListSchema,
  StaffListSchema,
  StaffProfileSchema,
  TaskPageSchema,
  TaskSchema,
  CreateAppointmentSchema,
  CreateServiceSchema,
  CreateTaskSchema,
} from '@deskhand/schemas'
import { z } from 'zod'
import { api } from './client'

export function usePipeline(locationId: string | null, q: string, enabled = true) {
  return useQuery({
    queryKey: ['pipeline', locationId, q],
    queryFn: ({ signal }) => api('/pipeline', { schema: PipelineBoardSchema, query: { locationId, q }, signal }),
    placeholderData: (previous) => previous,
    enabled,
  })
}

export function useMoveOpportunity() {
  return useMutation({
    mutationFn: (body: { id: string; stageId: string; reason?: string }) =>
      api(`/opportunities/${body.id}/move`, { method: 'POST', body: { stageId: body.stageId, reason: body.reason } }),
  })
}

export function useLeads(locationId: string | null, q: string) {
  return useQuery({
    queryKey: ['leads', locationId, q],
    queryFn: ({ signal }) => api('/leads', { schema: LeadListSchema, query: { locationId, q }, signal }),
    placeholderData: (previous) => previous,
  })
}

export function useQualifyLead() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { id: string; value?: number | null }) =>
      api(`/leads/${body.id}/qualify`, { method: 'POST', body: { value: body.value ?? null }, schema: LeadSchema }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['leads'] })
      void client.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}

export function useCalendar(locationId: string | null, from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['appointments', locationId, from, to],
    queryFn: ({ signal }) => api('/calendar', { schema: CalendarPayloadSchema, query: { locationId, from, to }, signal }),
    enabled,
  })
}

export function useServices() {
  return useQuery({
    queryKey: ['appointments', 'services'],
    queryFn: ({ signal }) => api('/services', { schema: ServiceListSchema, signal }),
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: z.infer<typeof CreateServiceSchema>) => api('/services', { method: 'POST', body, schema: ServiceSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function usePatchService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<{ visible: boolean; name: string; price: number }>) =>
      api(`/services/${id}`, { method: 'PATCH', body, schema: ServiceSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useStaffProfiles() {
  return useQuery({
    queryKey: ['appointments', 'staff'],
    queryFn: ({ signal }) => api('/staff-profiles', { schema: StaffListSchema, signal }),
  })
}

export function usePatchStaff() {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<{ bookable: boolean }>) =>
      api(`/staff-profiles/${id}`, { method: 'PATCH', body, schema: StaffProfileSchema }),
  })
}

export function useBookingPageSettings() {
  return useQuery({
    queryKey: ['public-booking', 'settings'],
    queryFn: ({ signal }) => api('/booking-page', { schema: BookingPageSettingsSchema, signal }),
  })
}

export function usePatchBookingPage() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/booking-page', { method: 'PATCH', body, schema: BookingPageSettingsSchema }),
  })
}

export function useSlots(date: string | null, serviceId: string | null) {
  return useQuery({
    queryKey: ['slots', date, serviceId],
    queryFn: ({ signal }) => api('/slots', { schema: SlotListSchema, query: { date, serviceId }, signal }),
    enabled: Boolean(date && serviceId),
  })
}

export function useCreateAppointment() {
  return useMutation({
    mutationFn: (body: z.infer<typeof CreateAppointmentSchema>) => api('/appointments', { method: 'POST', body, schema: AppointmentSchema }),
  })
}

export function usePatchAppointment() {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api(`/appointments/${id}`, { method: 'PATCH', body, schema: AppointmentSchema }),
  })
}

export function useTasks(
  view: string,
  locationId: string | null,
  filters?: { q?: string; linkedKind?: string; assignedUserId?: string; createdBy?: string },
) {
  return useQuery({
    queryKey: ['tasks', view, locationId, filters],
    queryFn: ({ signal }) =>
      api('/tasks', {
        schema: TaskPageSchema,
        query: {
          view,
          locationId,
          q: filters?.q,
          linkedKind: filters?.linkedKind,
          assignedUserId: filters?.assignedUserId,
          createdBy: filters?.createdBy,
        },
        signal,
      }),
  })
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: ({ signal }) => api(`/tasks/${id}`, { schema: TaskSchema, signal }),
    enabled: Boolean(id),
  })
}

export function useCreateTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: z.infer<typeof CreateTaskSchema>) => api('/tasks', { method: 'POST', body, schema: TaskSchema }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['tasks'] })
      void client.invalidateQueries({ queryKey: ['contacts'] })
      void client.invalidateQueries({ queryKey: ['pipeline'] })
      void client.invalidateQueries({ queryKey: ['home'] })
    },
  })
}

export function usePatchTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      done?: boolean
      title?: string
      notes?: string
      dueAt?: string
      assignedUserId?: string
      priority?: 'low' | 'normal' | 'high'
    }) => api(`/tasks/${id}`, { method: 'PATCH', body, schema: TaskSchema }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['tasks'] })
      void client.invalidateQueries({ queryKey: ['contacts'] })
      void client.invalidateQueries({ queryKey: ['pipeline'] })
      void client.invalidateQueries({ queryKey: ['home'] })
    },
  })
}

export function usePatchLocationTimezone() {
  return useMutation({
    mutationFn: ({ id, timezone }: { id: string; timezone: string }) =>
      api(`/locations/${id}`, { method: 'PATCH', body: { timezone }, schema: LocationSchema }),
  })
}
