/**
 * Deskhand form embed v1 — paste one script tag. Breaking changes ship as /embed/v2.js.
 * <script src="https://…/embed/v1.js" data-form="frm_…" data-mode="inline|popup" data-label="Enquire" async></script>
 */
;(function () {
  var script = document.currentScript
  if (!script) return
  var formId = script.getAttribute('data-form')
  if (!formId) return
  var mode = script.getAttribute('data-mode') || 'inline'
  var label = script.getAttribute('data-label') || 'Enquire'
  var root = script.src.replace(/\/embed\/v1\.js(\?.*)?$/, '')
  var src = root + '/embed/form/' + encodeURIComponent(formId)

  function iframe(minHeight) {
    var frame = document.createElement('iframe')
    frame.src = src
    frame.title = label
    frame.setAttribute('loading', 'lazy')
    frame.style.border = '0'
    frame.style.width = '100%'
    frame.style.minHeight = minHeight || '560px'
    frame.style.display = 'block'
    return frame
  }

  var parent = script.parentNode
  if (!parent) return

  if (mode === 'popup') {
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
    return
  }

  parent.insertBefore(iframe(), script)
})()
