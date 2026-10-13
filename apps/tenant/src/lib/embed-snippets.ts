export function publicOrigin() {
  if (typeof window === 'undefined') return 'http://localhost:5170'
  return window.location.origin
}

export function widgetScript(slug: string) {
  return `<script src="${publicOrigin()}/embed/widget.js" data-account="${slug}" async></script>`
}

/** Call from the site cookie banner after the visitor accepts (FR-W.15). */
export function widgetConsentHook() {
  return `DeskhandWidget.consent(true);`
}

export function bookingScript(slug: string, mode: 'inline' | 'popup' | 'floating', label = 'Book now') {
  return `<script src="${publicOrigin()}/embed/booking.js" data-account="${slug}" data-mode="${mode}" data-label="${label}" async></script>`
}

export function bookingIframe(slug: string) {
  const src = `${publicOrigin()}/b/${slug}/embed?mode=inline&framed=1`
  return `<iframe src="${src}" title="Book" style="width:100%;min-height:640px;border:0"></iframe>`
}

export function hostedBookingUrl(slug: string) {
  return `${publicOrigin()}/b/${slug}`
}

export function widgetPreviewUrl(slug: string) {
  return `${publicOrigin()}/embed/widget/${slug}`
}
