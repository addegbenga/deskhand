/**
 * Deskhand chat widget v1 — paste one script tag. Breaking changes ship as /embed/widget.v2.js.
 * <script src="https://…/embed/widget.js" data-account="your-slug" async></script>
 * Cookie banner: DeskhandWidget.consent(true)
 */
;(function () {
  var script = document.currentScript
  if (!script) return
  var slug = script.getAttribute('data-account')
  if (!slug) return
  var parent = script.parentNode
  if (!parent) return
  var root = script.src.replace(/\/embed\/widget\.js(\?.*)?$/, '')
  var frame = document.createElement('iframe')
  frame.src = root + '/embed/widget/' + encodeURIComponent(slug)
  frame.title = 'Chat'
  frame.setAttribute('loading', 'lazy')
  frame.setAttribute('allow', 'clipboard-write')
  parent.insertBefore(frame, script)

  function applySize(open) {
    var mobile = window.matchMedia('(max-width: 480px)').matches
    if (open && mobile) {
      frame.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483646;background:transparent;max-width:100vw;max-height:100vh'
      return
    }
    if (open) {
      frame.style.cssText =
        'position:fixed;bottom:16px;inset-inline-end:16px;width:400px;height:min(640px, calc(100vh - 32px));border:0;z-index:2147483646;background:transparent;max-width:calc(100vw - 24px)'
      return
    }
    frame.style.cssText =
      'position:fixed;bottom:12px;inset-inline-end:12px;width:88px;height:88px;border:0;z-index:2147483646;background:transparent;overflow:hidden'
  }
  applySize(false)

  var ready = false
  var queue = []
  function send(payload) {
    var message = { source: 'deskhand-widget', ...payload }
    if (ready && frame.contentWindow) frame.contentWindow.postMessage(message, '*')
    else queue.push(message)
  }
  frame.addEventListener('load', function () {
    ready = true
    while (queue.length) {
      if (frame.contentWindow) frame.contentWindow.postMessage(queue.shift(), '*')
    }
  })
  window.addEventListener('message', function (event) {
    var data = event.data
    if (!data || data.source !== 'deskhand-host') return
    if (data.type === 'resize') applySize(Boolean(data.open))
  })
  var api = {
    open: function () {
      send({ type: 'open' })
    },
    close: function () {
      send({ type: 'close' })
    },
    consent: function (granted) {
      if (granted === false) return
      send({ type: 'consent' })
    },
    identify: function (input) {
      send({ type: 'identify', name: (input && input.name) || '', phone: (input && input.phone) || '' })
    },
    showBooking: function () {
      send({ type: 'booking' })
    },
  }
  window.DeskhandWidget = api
  window.Widget = api
})()
