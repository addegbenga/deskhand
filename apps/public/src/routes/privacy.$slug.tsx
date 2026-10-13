import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import {
  DsarTypeSchema,
  PrivacyPageSchema,
  PrivacySubmitResultSchema,
  PrivacyVerifyResultSchema,
  isApiError,
} from '@deskhand/schemas'
import { Button, ErrorState, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@deskhand/ui'
import { api } from '../api'
import { PublicNotFound } from './__root'
import { PublicShell } from '../PublicShell'

function PrivacyPage() {
  const { slug } = Route.useParams()
  const { t } = useTranslation('public')
  const [type, setType] = useState<(typeof DsarTypeSchema.options)[number]>('access')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [code, setCode] = useState('')
  const query = useQuery({
    queryKey: ['public-privacy', slug],
    queryFn: ({ signal }) => api(`/public/privacy/${slug}`, { schema: PrivacyPageSchema, signal }),
  })
  const submit = useMutation({
    mutationFn: () =>
      api(`/public/privacy/${slug}`, {
        method: 'POST',
        body: { type, name, email, honeypot },
        schema: PrivacySubmitResultSchema,
      }),
  })
  const verify = useMutation({
    mutationFn: () =>
      api(`/public/privacy/${slug}/verify`, {
        method: 'POST',
        body: { requestId: submit.data?.requestId, code },
        schema: PrivacyVerifyResultSchema,
      }),
  })

  if (query.isPending) return <Skeleton className="mx-auto mt-12 h-40 max-w-lg" />
  if (isApiError(query.error, 'not_found') || !query.data) return <PublicNotFound />
  if (query.error) return <ErrorState onRetry={() => void query.refetch()} />

  return (
    <PublicShell tenant={query.data}>
      <h1 className="text-2xl font-semibold">{t('privacyPage.title')}</h1>
      <p className="mt-2 text-sm text-fg-muted">{t('privacyPage.intro', { business: query.data.name })}</p>
      {verify.isSuccess ? (
        <p className="mt-6">{t('privacyPage.done')}</p>
      ) : submit.isSuccess ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void verify.mutateAsync()
          }}
        >
          <Label htmlFor="code">{t('privacyPage.code')}</Label>
          <Input id="code" value={code} onChange={(event) => setCode(event.target.value)} />
          <Button type="submit">{t('privacyPage.verify')}</Button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit.mutateAsync()
          }}
        >
          <Label>{t('privacyPage.type')}</Label>
          <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
            <SelectTrigger aria-label={t('privacyPage.type')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DsarTypeSchema.options.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`privacyPage.types.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label htmlFor="pname">{t('privacyPage.name')}</Label>
          <Input id="pname" value={name} onChange={(event) => setName(event.target.value)} required />
          <Label htmlFor="pemail">{t('privacyPage.email')}</Label>
          <Input id="pemail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <div className="hidden" aria-hidden>
            <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
          </div>
          <Button type="submit">{t('privacyPage.send')}</Button>
        </form>
      )}
    </PublicShell>
  )
}

export const Route = createFileRoute('/privacy/$slug')({ component: PrivacyPage })
