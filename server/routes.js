import { buildUserResponse, getTokenFromRequest, requirePermission } from './lib/auth.js'
import { createError } from './lib/errors.js'
import { parseBody, sendJson } from './lib/http.js'
import { readDatabase, writeDatabase } from './lib/storage.js'
import {
  archiveRecord,
  createRecord,
  getSummary,
  listRecords,
  toRecordResponse,
  updateRecord,
} from './models/recordModel.js'
import {
  createUser,
  findUserByEmail,
  findUserByToken,
  listUsers,
  updateUser,
} from './models/userModel.js'

export async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok', service: 'finance-dashboard-api' })
    return
  }

  const database = await readDatabase()
  const token = getTokenFromRequest(request)
  const actor = findUserByToken(database, token)

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    await handleLogin(request, response, database)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/auth/me') {
    requirePermission(actor, 'summary:read')
    sendJson(response, 200, { user: buildUserResponse(actor) })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/summary') {
    requirePermission(actor, 'summary:read')
    sendJson(response, 200, getSummary(database))
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/records') {
    requirePermission(actor, 'records:read')
    sendJson(response, 200, listRecords(database, url))
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/records') {
    requirePermission(actor, 'records:write')
    await handleCreateRecord(request, response, database, actor)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/users') {
    requirePermission(actor, 'users:manage')
    sendJson(response, 200, {
      data: listUsers(database),
    })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/users') {
    requirePermission(actor, 'users:manage')
    await handleCreateUser(request, response, database)
    return
  }

  const recordIdMatch = url.pathname.match(/^\/api\/records\/([^/]+)$/)

  if (recordIdMatch && request.method === 'PUT') {
    requirePermission(actor, 'records:write')
    await handleUpdateRecord(request, response, database, recordIdMatch[1])
    return
  }

  if (recordIdMatch && request.method === 'DELETE') {
    requirePermission(actor, 'records:write')
    await handleDeleteRecord(response, database, recordIdMatch[1])
    return
  }

  const userIdMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/)

  if (userIdMatch && request.method === 'PUT') {
    requirePermission(actor, 'users:manage')
    await handleUpdateUser(request, response, database, userIdMatch[1])
    return
  }

  throw createError(404, 'Endpoint not found.')
}

async function handleLogin(request, response, database) {
  const body = await parseBody(request)
  const email = String(body.email ?? '').trim().toLowerCase()

  if (!email) {
    throw createError(422, 'Email is required to start a session.', {
      email: 'Email is required.',
    })
  }

  const user = findUserByEmail(database, email)

  if (!user) {
    throw createError(404, 'No user exists for the provided email.')
  }

  if (user.status !== 'active') {
    throw createError(403, 'This account is inactive and cannot sign in.')
  }

  sendJson(response, 200, {
    message: 'Sign-in completed successfully.',
    token: user.token,
    user: buildUserResponse(user),
  })
}

async function handleCreateRecord(request, response, database, actor) {
  const body = await parseBody(request)
  const newRecord = createRecord(database, actor, body)

  await writeDatabase(database)

  sendJson(response, 201, {
    message: 'Record created successfully.',
    record: toRecordResponse(newRecord),
  })
}

async function handleUpdateRecord(request, response, database, recordId) {
  const body = await parseBody(request)
  const record = updateRecord(database, recordId, body)
  await writeDatabase(database)

  sendJson(response, 200, {
    message: 'Record updated successfully.',
    record: toRecordResponse(record),
  })
}

async function handleDeleteRecord(response, database, recordId) {
  const record = archiveRecord(database, recordId)
  await writeDatabase(database)

  sendJson(response, 200, {
    message: 'Record archived successfully.',
    record: toRecordResponse(record),
  })
}

async function handleCreateUser(request, response, database) {
  const body = await parseBody(request)
  const newUser = createUser(database, body)
  await writeDatabase(database)

  sendJson(response, 201, {
    message: 'User created successfully.',
    user: buildUserResponse(newUser),
    token: newUser.token,
  })
}

async function handleUpdateUser(request, response, database, userId) {
  const body = await parseBody(request)
  const user = updateUser(database, userId, body)
  await writeDatabase(database)

  sendJson(response, 200, {
    message: 'User profile updated successfully.',
    user: buildUserResponse(user),
  })
}
