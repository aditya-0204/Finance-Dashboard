import { createError } from './errors.js'

export function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Auth-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  })

  response.end(JSON.stringify(payload))
}

export async function parseBody(request) {
  let body = ''

  for await (const chunk of request) {
    body += chunk

    if (body.length > 1_000_000) {
      throw createError(413, 'Request body is too large.')
    }
  }

  if (!body) {
    return {}
  }

  try {
    return JSON.parse(body)
  } catch {
    throw createError(400, 'Request body must be valid JSON.')
  }
}
