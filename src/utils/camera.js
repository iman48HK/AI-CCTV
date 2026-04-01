/**
 * Browsers only expose getUserMedia in a secure context (HTTPS, or localhost).
 * Plain http://<public-ip> is not secure — camera will not work until HTTPS is used.
 */
export function getCameraSecureContextMessage() {
  if (typeof window === 'undefined') return null
  if (window.isSecureContext) return null
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return null
  const httpsUrl = window.location.href.replace(/^http:/i, 'https:')
  return `Camera needs a secure connection (HTTPS). Use ${httpsUrl} (accept the certificate warning if shown), or open the app on localhost.`
}

export function assertCameraSecureContext() {
  const msg = getCameraSecureContextMessage()
  if (msg) {
    const err = new Error(msg)
    err.name = 'InsecureContextError'
    throw err
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    const err = new Error('Camera is not supported in this browser.')
    err.name = 'NotSupportedError'
    throw err
  }
}
