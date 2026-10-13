import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import {
  Breadcrumbs,
  Button,
  CopyField,
  Input,
  Label,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Switch,
  Textarea,
  toast,
  usePermission,
} from '@deskhand/ui'
import { bookingIframe, bookingScript, hostedBookingUrl } from '../../lib/embed-snippets'
import { useBookingPageSettings, usePatchBookingPage } from '../../api/booking'
import { useSession } from '../../api/queries'

export function BookingPageSettings() {
  const { t } = useTranslation(['calendar', 'common'])
  const session = useSession()
  const access = usePermission('calendar.edit')
  const page = useBookingPageSettings()
  const patch = usePatchBookingPage()
  const [welcome, setWelcome] = useState('')
  const [notice, setNotice] = useState('2')
  const [horizon, setHorizon] = useState('28')
  const [instant, setInstant] = useState(true)
  const [consent, setConsent] = useState('')

  useEffect(() => {
    if (!page.data) return
    setWelcome(page.data.welcome)
    setNotice(String(page.data.noticeHours))
    setHorizon(String(page.data.horizonDays))
    setInstant(page.data.instantBook)
    setConsent(page.data.consentText)
  }, [page.data])

  if (!canSeeArea(session.membership.role, 'bookings')) {
    return (
      <PageContainer>
        <PageHeader title={t('pageSettings.title')} />
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  const slug = session.account.slug
  const href = hostedBookingUrl(slug)

  return (
    <PageContainer>
      <PageHeader
        title={t('pageSettings.title')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('title'), render: (label) => <Link to="/app/bookings">{label}</Link> }, { label: t('pageSettings.title') }]} />}
        action={
          <Button asChild variant="outline">
            <a href={href} target="_blank" rel="noreferrer">
              {t('pageSettings.open')}
            </a>
          </Button>
        }
      />
      <div className="mb-4 max-w-xl">
        <Label>{t('pageSettings.link')}</Label>
        <CopyField className="mt-1" label={t('pageSettings.link')} value={href} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void patch
              .mutateAsync({ welcome, noticeHours: Number(notice), horizonDays: Number(horizon), instantBook: instant, consentText: consent })
              .then(() => toast.success(t('common:actions.save')))
          }}
        >
          <div>
            <Label htmlFor="welcome">{t('pageSettings.welcome')}</Label>
            <Textarea id="welcome" className="mt-1" value={welcome} onChange={(e) => setWelcome(e.target.value)} disabled={!access.allowed} />
          </div>
          <div>
            <Label htmlFor="notice">{t('pageSettings.notice')}</Label>
            <Input id="notice" className="mt-1" value={notice} onChange={(e) => setNotice(e.target.value)} disabled={!access.allowed} />
          </div>
          <div>
            <Label htmlFor="horizon">{t('pageSettings.horizon')}</Label>
            <Input id="horizon" className="mt-1" value={horizon} onChange={(e) => setHorizon(e.target.value)} disabled={!access.allowed} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={instant} onCheckedChange={setInstant} disabled={!access.allowed} />
            <Label>{t('pageSettings.instant')}</Label>
          </div>
          <div>
            <Label htmlFor="consent">{t('pageSettings.consent')}</Label>
            <Textarea id="consent" className="mt-1" value={consent} onChange={(e) => setConsent(e.target.value)} disabled={!access.allowed} />
          </div>
          {access.allowed && <Button type="submit">{t('common:actions.save')}</Button>}
        </form>
        <div>
          <p className="mb-2 text-sm font-medium">{t('pageSettings.preview')}</p>
          <iframe title={t('pageSettings.preview')} src={href} className="h-[32rem] w-full rounded-md border border-border bg-surface" />
          <p className="mt-3 text-sm font-medium">{t('pageSettings.embed')}</p>
          <p className="mt-1 text-xs text-fg-muted">{t('pageSettings.embedHint')}</p>
          <div className="mt-3 space-y-3">
            <div>
              <Label>{t('pageSettings.embedInline')}</Label>
              <CopyField className="mt-1" label={t('pageSettings.embedInline')} value={bookingScript(slug, 'inline')} multiline />
            </div>
            <div>
              <Label>{t('pageSettings.embedPopup')}</Label>
              <CopyField className="mt-1" label={t('pageSettings.embedPopup')} value={bookingScript(slug, 'popup')} multiline />
            </div>
            <div>
              <Label>{t('pageSettings.embedFloating')}</Label>
              <CopyField className="mt-1" label={t('pageSettings.embedFloating')} value={bookingScript(slug, 'floating')} multiline />
            </div>
            <div>
              <Label>{t('pageSettings.iframe')}</Label>
              <CopyField className="mt-1" label={t('pageSettings.iframe')} value={bookingIframe(slug)} multiline />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={`${href}/embed?mode=inline`} target="_blank" rel="noreferrer">
                {t('pageSettings.previewInline')}
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`${href}/embed?mode=popup`} target="_blank" rel="noreferrer">
                {t('pageSettings.previewPopup')}
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`${href}/embed?mode=floating`} target="_blank" rel="noreferrer">
                {t('pageSettings.previewFloating')}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
