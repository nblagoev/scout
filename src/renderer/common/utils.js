export function getStatusClass(statusCode) {
  if (statusCode >= 100 && statusCode < 200) {
    return 'info'
  } else if (statusCode >= 200 && statusCode < 300) {
    return 'success'
  } else if (statusCode >= 300 && statusCode < 400) {
    return 'redirect'
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'client-error'
  } else if (statusCode >= 500 && statusCode < 600) {
    return 'server-error'
  }

  return 'unknown'
}

export function toBase64(str) {
  return (new Buffer(str || '', 'ascii')).toString('base64')
}

export function fromBase64(str) {
  return (new Buffer(str || '', 'base64')).toString('ascii')
}
