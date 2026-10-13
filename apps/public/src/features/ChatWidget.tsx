import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, CreditCard, MapPin, MessageCircle, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import {
  WidgetBootstrapSchema,
  WidgetSessionSchema,
  type WidgetBootstrap,
  type WidgetCard,
  type WidgetSession,
} from '@deskhand/schemas'
import { AIBadge, Avatar, Button, IconButton, Input, Label, brandStyle, cn, toast } from '@deskhand/ui'
import { api } from '../api'

export type ChatWidgetHandle = {
  open: () => void
  close: () => void
  identify: (input: { name: string; phone: string }) => void
  consent: () => void
  showBooking: () => void
}

function notifyHost(open: boolean) {
  window.parent?.postMessage({ source: 'deskhand-host', type: 'resize', open }, '*')
}

function CardBlock({ card }: { card: WidgetCard }) {
  if (card.type === 'slots') {
    return (
      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface">
        <p className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5 text-[11px] font-medium text-fg-muted">
          <Calendar className="size-3.5" aria-hidden />
          {card.title}
        </p>
        <div className="flex flex-col">
          {card.slots.map((slot) => (
            <a key={slot.startsAt} className="px-2.5 py-1.5 text-xs hover:bg-surface-2" href={card.href}>
              {slot.label}
            </a>
          ))}
        </div>
      </div>
    )
  }
  if (card.type === 'payment') {
    return (
      <a
        className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs hover:bg-surface-2"
        href={card.href}
      >
        <CreditCard className="size-3.5 text-fg-muted" aria-hidden />
        <span>
          {card.title} {card.amountLabel}
        </span>
      </a>
    )
  }
  if (card.type === 'location') {
    return (
      <p className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-fg-muted" aria-hidden />
        <span>
          {card.title}
          {card.address ? ` · ${card.address}` : ''}
        </span>
      </p>
    )
  }
  return (
    <a
      className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs hover:bg-surface-2"
      href={card.href}
    >
      <span className="font-medium">{card.title}</span>
      {card.priceLabel && <span className="text-fg-muted">{card.priceLabel}</span>}
    </a>
  )
}

export const ChatWidget = forwardRef<ChatWidgetHandle, { slug: string }>(function ChatWidget({ slug }, ref) {
  const { t } = useTranslation('public')
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [visitorId] = useState<string>(() => sessionStorage.getItem(`dh-vis-${slug}`) ?? crypto.randomUUID())
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [draft, setDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const query = useQuery({
    queryKey: ['public-widget', slug, visitorId],
    queryFn: ({ signal }) =>
      api('/public/widget/' + encodeURIComponent(slug), { schema: WidgetBootstrapSchema, query: { visitorId }, signal }),
  })
  const config = query.data?.config
  const [session, setSession] = useState<WidgetSession | undefined>()
  const shown = session ?? query.data?.session

  const writeSession = (next: WidgetSession) => {
    setSession(next)
    client.setQueryData(['public-widget', slug, visitorId], (current: WidgetBootstrap | undefined) =>
      current ? { ...current, session: next } : current,
    )
  }

  const consent = useMutation({
    mutationFn: () =>
      api('/public/widget/' + slug + '/consent', { method: 'POST', body: { visitorId, granted: true }, schema: WidgetSessionSchema }),
    onSuccess: writeSession,
  })
  const identify = useMutation({
    mutationFn: (input: { name: string; phone: string }) =>
      api('/public/widget/' + slug + '/identify', { method: 'POST', body: { visitorId, ...input }, schema: WidgetSessionSchema }),
    onSuccess: writeSession,
  })
  const send = useMutation({
    mutationFn: (body: string) =>
      api('/public/widget/' + slug + '/messages', { method: 'POST', body: { visitorId, body }, schema: WidgetSessionSchema }),
    onSuccess: writeSession,
    onError: () => toast.error(t('widget.sendFailed')),
  })

  const inIframe = typeof window !== 'undefined' && window.parent !== window

  useEffect(() => {
    if (!inIframe) return
    document.documentElement.classList.add('embed-frame')
    return () => document.documentElement.classList.remove('embed-frame')
  }, [inIframe])

  useEffect(() => {
    if (window.parent !== window) notifyHost(open)
  }, [open])

  useEffect(() => {
    if (shown?.consented) sessionStorage.setItem(`dh-vis-${slug}`, visitorId)
  }, [shown?.consented, slug, visitorId])

  useEffect(() => {
    const node = scroller.current
    if (node) node.scrollTop = node.scrollHeight
  }, [shown?.messages.length, send.isPending, shown?.consented, shown?.identified])

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
    identify: (input) => {
      setName(input.name)
      setPhone(input.phone)
      void identify.mutateAsync(input)
    },
    consent: () => void consent.mutateAsync(),
    showBooking: () => {
      if (config) window.location.assign(config.bookingHref)
    },
  }))

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; name?: string; phone?: string } | null
      if (!data || data.source !== 'deskhand-widget') return
      if (data.type === 'open') setOpen(true)
      if (data.type === 'close') setOpen(false)
      if (data.type === 'consent') void consent.mutateAsync()
      if (data.type === 'identify') {
        const next = { name: data.name ?? 'Guest', phone: data.phone ?? '' }
        setName(next.name)
        setPhone(next.phone)
        void identify.mutateAsync(next)
      }
      if (data.type === 'booking' && config) window.location.assign(config.bookingHref)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [config, consent, identify])

  const needsConsent = Boolean(config?.requireConsent && !shown?.consented)
  const needsPrechat = Boolean(shown && !shown.identified && !needsConsent)
  const branded = brandStyle(config?.brandColor)

  return (
    <>
      {!open && (
        <button
          type="button"
          className="fixed bottom-4 end-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-brand text-brand-fg shadow-[0_8px_24px_rgb(0_0_0/0.18)] transition-transform hover:scale-105"
          style={branded}
          aria-label={t('widget.open')}
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="size-6" />
        </button>
      )}
      {open && config && (
        <section
          className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-surface shadow-[0_16px_48px_rgb(0_0_0/0.2)] sm:inset-auto sm:bottom-4 sm:end-4 sm:h-[min(40rem,calc(100dvh-2rem))] sm:w-[23.5rem] sm:rounded-2xl sm:border sm:border-border"
          aria-label={t('widget.title')}
          style={branded}
        >
          <header className="flex items-center gap-3 bg-brand px-3 py-3 text-brand-fg">
            <Avatar name={config.employeeName} className="size-10 bg-brand-fg/15 text-brand-fg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{config.employeeName}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-brand-fg/85">
                <span
                  className={cn('size-1.5 rounded-full', config.afterHours ? 'bg-brand-fg/50' : 'bg-success')}
                  aria-hidden
                />
                {config.afterHours ? t('widget.offline') : t('widget.online')}
              </p>
            </div>
            <IconButton
              label={t('widget.close')}
              size="icon-sm"
              className="text-brand-fg hover:bg-brand-fg/15"
              onClick={() => setOpen(false)}
            >
              <X />
            </IconButton>
          </header>

          {needsConsent ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-5 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <ShieldCheck className="size-6" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{config.name}</p>
                <p className="text-sm text-fg">{config.greeting}</p>
              </div>
              <p className="flex items-center justify-center gap-1 text-xs text-fg-muted">
                <Sparkles className="size-3.5 text-ai" aria-hidden />
                {t('widget.aiIntro', { name: config.employeeName })}
              </p>
              <p className="text-xs text-fg-muted">{t('widget.notice', { notice: config.storedNotice })}</p>
              <Button className="w-full" onClick={() => void consent.mutateAsync()} disabled={consent.isPending}>
                {t('widget.allow')}
              </Button>
              <p className="text-xs text-fg-muted">
                {t('widget.consent')}{' '}
                <a className="underline" href={config.privacyHref} target="_blank" rel="noreferrer">
                  {t('privacy')}
                </a>
              </p>
            </div>
          ) : (
            <>
              <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
                {needsPrechat && (
                  <form
                    className="space-y-2 rounded-xl border border-border bg-surface-2/60 p-3"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void identify.mutateAsync({ name, phone })
                    }}
                  >
                    <p className="text-xs font-medium">{t('widget.preamble')}</p>
                    <Label htmlFor="widget-name">{t('widget.name')}</Label>
                    <Input id="widget-name" value={name} onChange={(event) => setName(event.target.value)} required />
                    <Label htmlFor="widget-phone">{t('widget.phone')}</Label>
                    <Input id="widget-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
                    <Button type="submit" size="sm" className="w-full" disabled={identify.isPending}>
                      {t('widget.start')}
                    </Button>
                  </form>
                )}
                {shown?.messages.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2',
                      item.role === 'visitor' ? 'ms-auto bg-brand text-brand-fg' : 'me-auto border border-border bg-surface-2',
                    )}
                  >
                    {item.role === 'ai' && <AIBadge name={config.employeeName} className="mb-1" />}
                    <p className="whitespace-pre-wrap">{item.body}</p>
                    {item.cards.map((card, index) => (
                      <CardBlock key={index} card={card} />
                    ))}
                  </div>
                ))}
                {send.isPending && (
                  <p className="me-auto text-xs text-fg-muted" role="status">
                    {t('widget.typing', { name: config.employeeName })}
                  </p>
                )}
                {!needsPrechat && shown?.messages.length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {config.suggested.map((item) => (
                      <Button key={item} size="sm" variant="outline" className="rounded-full" onClick={() => void send.mutateAsync(item)}>
                        {item}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <footer className="border-t border-border bg-surface p-2">
                <form
                  className="flex items-end gap-1.5"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!draft.trim()) return
                    void send.mutateAsync(draft)
                    setDraft('')
                  }}
                >
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    aria-label={t('widget.placeholder')}
                    placeholder={t('widget.placeholder')}
                    className="rounded-xl"
                  />
                  <Button type="submit" size="icon" disabled={send.isPending || !draft.trim()} aria-label={t('widget.send')}>
                    <Send className="size-4" />
                  </Button>
                </form>
                <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">
                  <button type="button" className="text-fg-muted hover:text-fg" onClick={() => void send.mutateAsync(t('widget.human'))}>
                    {t('widget.human')}
                  </button>
                  <a className="text-fg-muted hover:text-fg" href={config.whatsappHref}>
                    {t('widget.whatsapp')}
                  </a>
                  <a className="text-fg-muted hover:text-fg" href={config.bookingHref}>
                    {t('widget.book')}
                  </a>
                </div>
                {config.showPoweredBy && (
                  <p className="mt-1 text-center text-[10px] text-fg-muted">{t('poweredBy', { brand: 'Deskhand' })}</p>
                )}
              </footer>
            </>
          )}
        </section>
      )}
    </>
  )
})
