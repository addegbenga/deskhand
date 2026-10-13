import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useTranslation } from '@deskhand/i18n'
import { Button, Dialog, DialogContent, DialogTitle } from '@deskhand/ui'
import { ChatWidget, type ChatWidgetHandle } from '../features/ChatWidget'
import { PublicForm } from '../features/PublicForm'

function WidgetDemo() {
  const { slug } = Route.useSearch()
  const { t } = useTranslation('public')
  const widget = useRef<ChatWidgetHandle>(null)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    const api = {
      open: () => widget.current?.open(),
      close: () => widget.current?.close(),
      identify: (input: { name?: string; email?: string; phone?: string }) =>
        widget.current?.identify({ name: input.name ?? 'Guest', phone: input.phone ?? '' }),
      setAttributes: () => undefined,
      showBooking: () => widget.current?.showBooking(),
      consent: (granted = true) => {
        if (granted) widget.current?.consent()
      },
    }
    const host = window as Window & { DeskhandWidget?: typeof api; Widget?: typeof api }
    host.DeskhandWidget = api
    host.Widget = api
    return () => {
      delete host.DeskhandWidget
      delete host.Widget
    }
  }, [])

  return (
    <main className="min-h-dvh bg-bg px-4 py-8">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">{t('demo.title')}</h1>
        <p className="text-sm text-fg-muted">{t('demo.body')}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => widget.current?.open()}>
            {t('demo.open')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => widget.current?.consent()}>
            {t('demo.consent')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => widget.current?.identify({ name: 'Kemi Ajayi', phone: '+234 803 111 9999' })}
          >
            {t('demo.identify')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => widget.current?.showBooking()}>
            {t('demo.booking')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            {t('demo.form')}
          </Button>
        </div>
      </div>
      <ChatWidget ref={widget} slug={slug} />
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogTitle>{t('form.popup')}</DialogTitle>
          <PublicForm formId="frm_A_lead" framed />
        </DialogContent>
      </Dialog>
    </main>
  )
}

export const Route = createFileRoute('/embed/demo')({
  validateSearch: z.object({ slug: z.string().default('amaka-braids') }),
  component: WidgetDemo,
})
