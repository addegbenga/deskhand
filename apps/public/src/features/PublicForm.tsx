import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { PublicFormPageSchema, PublicFormResultSchema, isApiError } from '@deskhand/schemas'
import { Button, ErrorState, FormPreview, Skeleton } from '@deskhand/ui'
import { api } from '../api'
import { PublicNotFound } from '../routes/__root'
import { PublicShell } from '../PublicShell'

export function PublicForm({ formId, framed }: { formId: string; framed?: boolean }) {
  const { t } = useTranslation('public')
  const [values, setValues] = useState<Record<string, string>>({})
  const [honeypot, setHoneypot] = useState('')
  const query = useQuery({
    queryKey: ['public-form', formId],
    queryFn: ({ signal }) => api(`/public/forms/${formId}`, { schema: PublicFormPageSchema, signal }),
  })
  const submit = useMutation({
    mutationFn: () =>
      api(`/public/forms/${formId}/submit`, { method: 'POST', body: { answers: values, honeypot }, schema: PublicFormResultSchema }),
  })

  if (query.isPending) return <Skeleton className="mx-auto mt-12 h-48 max-w-lg" />
  if (isApiError(query.error, 'not_found') || !query.data) return <PublicNotFound />
  if (query.error) return <ErrorState onRetry={() => void query.refetch()} />

  const inner = submit.isSuccess ? (
    <p>{query.data.form.thankYou || t('form.thanks')}</p>
  ) : (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit.mutateAsync()
      }}
    >
      <h1 className="text-xl font-semibold">{query.data.form.name}</h1>
      <FormPreview fields={query.data.form.fields} values={values} onChange={(id, value) => setValues((current) => ({ ...current, [id]: value }))} />
      <div className="hidden" aria-hidden>
        <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
      </div>
      <Button type="submit" disabled={submit.isPending}>
        {t('form.submit')}
      </Button>
    </form>
  )

  if (framed) return <div className="bg-bg p-4">{inner}</div>
  return <PublicShell tenant={query.data}>{inner}</PublicShell>
}
