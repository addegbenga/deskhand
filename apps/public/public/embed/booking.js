/**
 * Deskhand booking embed v1 — paste one script tag. Breaking changes ship as /embed/booking.v2.js.
 * <script src="https://…/embed/booking.js" data-account="your-slug" data-mode="inline|popup|floating" async></script>
 */
;(function () {
  var script = document.currentScript
  if (!script) return
  var slug = script.getAttribute('data-account')
  if (!slug) return
  var mode = script.getAttribute('data-mode') || 'inline'
  var label = script.getAttribute('data-label') || 'Book now'
  var parent = script.parentNode
  if (!parent) return
  var root = script.src.replace(/\/embed\/booking\.js(\?.*)?$/, '')
  var src = root + '/b/' + encodeURIComponent(slug) + '/embed?mode=' + encodeURIComponent(mode) + '&framed=1'

  function iframe(minHeight) {
    var frame = document.createElement('iframe')
    frame.src = src
    frame.title = label
    frame.setAttribute('loading', 'lazy')
    frame.style.border = '0'
    frame.style.width = '100%'
    frame.style.minHeight = minHeight || '640px'
    frame.style.display = 'block'
    return frame
  }

  if (mode === 'inline') {
    parent.insertBefore(iframe(), script)
    return
  }

  if (mode === 'floating') {
    var fab = document.createElement('button')
    fab.type = 'button'
    fab.textContent = label
    fab.style.cssText =
      'position:fixed;bottom:24px;inset-inline-end:24px;z-index:2147483646;font:inherit;padding:12px 18px;border:0;border-radius:999px;background:#111;color:#fff;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2)'
    var panel = null
    fab.addEventListener('click', function () {
      if (panel) {
        panel.remove()
        panel = null
        return
      }
      panel = document.createElement('div')
      panel.style.cssText =
        'position:fixed;bottom:80px;inset-inline-end:24px;z-index:2147483646;width:min(420px,calc(100vw - 32px));max-height:80vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.2)'
      panel.appendChild(iframe('70vh'))
      document.body.appendChild(panel)
    })
    parent.insertBefore(fab, script)
    return
  }

  var button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.style.cssText =
    'font:inherit;padding:10px 16px;border:0;border-radius:8px;background:#111;color:#fff;cursor:pointer'
  button.addEventListener('click', function () {
    var overlay = document.createElement('div')
    overlay.setAttribute('role', 'dialog')
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px'
    var box = document.createElement('div')
    box.style.cssText =
      'background:#fff;max-width:420px;width:100%;max-height:90vh;overflow:auto;border-radius:12px;position:relative;padding-top:36px'
    var close = document.createElement('button')
    close.type = 'button'
    close.textContent = '\u00d7'
    close.setAttribute('aria-label', 'Close')
    close.style.cssText =
      'position:absolute;top:8px;inset-inline-end:8px;border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer'
    function dismiss() {
      overlay.remove()
    }
    close.onclick = dismiss
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) dismiss()
    })
    box.appendChild(close)
    box.appendChild(iframe('70vh'))
    overlay.appendChild(box)
    document.body.appendChild(overlay)
  })
  parent.insertBefore(button, script)
})()
