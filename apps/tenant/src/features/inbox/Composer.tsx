import { Link } from '@tanstack/react-router'
import { Clock, Languages, Paperclip, Send, Smile, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { isApiError, type ConversationThread, type SendBlockReason } from '@deskhand/schemas'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@deskhand/ui'
import { useRecordConsent, useSavedReplies, useSendMessage, useTemplates, useTranslate } from '../../api/crm'
import { useSession } from '../../api/queries'
import { widgetPreviewUrl } from '../../lib/embed-snippets'

const EMOJI = ['😊', '🙏', '👍', '🎉', '❤️', '😂']

export function Composer({
  conversationId,
  thread,
  canSend,
}: {
  conversationId: string
  thread: ConversationThread
  canSend: boolean
}) {
  const { t } = useTranslation(['inbox', 'common'])
  const [body, setBody] = useState(thread.conversation.draft?.body ?? '')
  const [note, setNote] = useState(false)
  const [templateId, setTemplateId] = useState<string>()
  const [scheduledFor, setScheduledFor] = useState<string | null>(null)
  const send = useSendMessage(conversationId)
  const templates = useTemplates()
  const replies = useSavedReplies()
  const translate = useTranslate()
  const windowClosed = thread.conversation.channel === 'whatsapp' && !thread.window.open
  const block: SendBlockReason | null = thread.sendBlock?.reason ?? null
  const blocked = Boolean(block && !note)
  const approved = (templates.data ?? []).filter((item) => item.status === 'approved')

  const submit = () => {
    void send
      .mutateAsync({ body, note, templateId, scheduledFor })
      .then(() => {
        toast.success(note ? t('noted') : scheduledFor ? t('composer.scheduled') : t('sent'))
        setBody('')
        setTemplateId(undefined)
        setScheduledFor(null)
      })
      .catch((error: unknown) => {
        const reason = isApiError(error) ? error.fieldErrors?.send?.[0] : undefined
        if (reason) toast.error(t(`composer.blocked.${reason as SendBlockReason}`))
      })
  }

  return (
    <div className="border-t border-border p-3">
      {blocked && block ? <SendBlockNotice thread={thread} reason={block} canSend={canSend} /> : null}
      {!note && approved.length > 0 && (
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger className="mb-2" aria-label={t('composer.templates')}>
            <SelectValue placeholder={t('composer.templates')} />
          </SelectTrigger>
          <SelectContent>
            {approved.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {scheduledFor && <p className="mb-2 text-xs text-fg-muted">{t('composer.sendAt', { when: scheduledFor })}</p>}
      <Textarea
        id="composer"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={note ? t('composer.note') : t('composer.placeholder')}
        disabled={!canSend || (blocked && !note)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit()
        }}
      />
      {translate.data && (
        <p className="mt-2 rounded-md bg-surface-2 px-2 py-1 text-xs">
          {t('composer.translating')}: {translate.data.translated}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Button size="sm" variant={note ? 'secondary' : 'ghost'} onClick={() => setNote((v) => !v)} disabled={!canSend}>
          <StickyNote />
          {t('composer.note')}
        </Button>
        <Select
          onValueChange={(id) => {
            const reply = replies.data?.find((item) => item.id === id)
            if (reply) setBody(reply.body)
          }}
        >
          <SelectTrigger className="h-8 w-40" aria-label={t('composer.replies')}>
            <SelectValue placeholder={t('composer.replies')} />
          </SelectTrigger>
          <SelectContent>
            {(replies.data ?? []).map((reply) => (
              <SelectItem key={reply.id} value={reply.id}>
                {reply.shortcut}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconButton
          label={t('composer.attach')}
          size="icon-sm"
          disabled={!canSend}
          onClick={() => toast(t('composer.attachHint'))}
        >
          <Paperclip />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={t('composer.emoji')} size="icon-sm" disabled={!canSend}>
              <Smile />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {EMOJI.map((item) => (
              <DropdownMenuItem key={item} onSelect={() => setBody((cur) => `${cur}${item}`)}>
                {item}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton
          label={t('composer.translate')}
          size="icon-sm"
          disabled={!body}
          onClick={() => void translate.mutate({ text: body, to: thread.contact.language === 'en' ? 'pcm' : 'en' })}
        >
          <Languages />
        </IconButton>
        <IconButton
          label={t('composer.schedule')}
          size="icon-sm"
          disabled={!canSend}
          onClick={() => setScheduledFor(new Date(Date.now() + 60 * 60 * 1000).toISOString())}
        >
          <Clock />
        </IconButton>
        <Button
          size="sm"
          className="ms-auto"
          disabled={!canSend || blocked || send.isPending || (windowClosed && !note && !templateId) || (!body && !templateId)}
          onClick={submit}
        >
          <Send />
          {t('composer.send')}
        </Button>
      </div>
    </div>
  )
}

function SendBlockNotice({
  thread,
  reason,
  canSend,
}: {
  thread: ConversationThread
  reason: SendBlockReason
  canSend: boolean
}) {
  const { t } = useTranslation(['inbox', 'common'])
  const session = useSession()
  const record = useRecordConsent(thread.contact.id)
  const channel = t(`common:channels.${thread.conversation.channel}`)
  const webchat = thread.conversation.channel === 'webchat'
  const hintKey = reason === 'consent_missing' && webchat ? 'composer.blockedHint.consent_missing_webchat' : `composer.blockedHint.${reason}`
  return (
    <div className="mb-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
      <p className="font-medium text-danger">{t(`composer.blocked.${reason}`)}</p>
      <p className="mt-1 text-fg-muted">{t(hintKey, { channel })}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {reason === 'consent_missing' && webchat && (
          <Button size="sm" variant="outline" asChild>
            <a href={widgetPreviewUrl(session.account.slug)} target="_blank" rel="noreferrer">
              {t('composer.openWidget')}
            </a>
          </Button>
        )}
        {reason === 'consent_missing' && canSend && (
          <Button
            size="sm"
            variant={webchat ? 'ghost' : 'primary'}
            onClick={() =>
              void record
                .mutateAsync({ channel: thread.conversation.channel, status: 'granted' })
                .then(() => toast.success(t('composer.consentRecorded')))
                .catch((error: unknown) => {
                  const code = isApiError(error) ? error.fieldErrors?.consent?.[0] : undefined
                  toast.error(code ? t(`composer.blocked.${code as SendBlockReason}`) : t('composer.consentFailed'))
                })
            }
            disabled={record.isPending}
          >
            {t('composer.recordConsent', { channel })}
          </Button>
        )}
        {(reason === 'consent_missing' || reason === 'opted_out') && (
          <>
            <Button size="sm" variant="outline" asChild>
              <a href="#contact-consent">{t('composer.seeConsent')}</a>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/app/contacts/$contactId" params={{ contactId: thread.contact.id }}>
                {t('composer.openContact')}
              </Link>
            </Button>
          </>
        )}
        {reason === 'channel_down' && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/connections">{t('channelDownFix')}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
