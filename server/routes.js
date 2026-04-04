import { buildUserResponse, getTokenFromRequest, requirePermission } from './lib/auth.js'
import { createError } from './lib/errors.js'
import { parseBody, sendJson } from './lib/http.js'
import {
  buildSummary,
  filterRecords,
  parsePagination,
  sanitizeRecord,
  validateRecordInput,
} from './lib/records.js'
import { readDatabase, writeDatabase } from './lib/storage.js'
import { validateUserInput } from './lib/users.js'

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
  const actor = database.users.find((user) => user.token === token) ?? null

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
    sendJson(response, 200, buildSummary(database.records))
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/records') {
    requirePermission(actor, 'records:read')
    sendJson(response, 200, buildRecordsListResponse(database.records, url))
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
      data: database.users.map(buildUserResponse),
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

  const user = database.users.find((entry) => entry.email === email)

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

function buildRecordsListResponse(records, url) {
  const filteredRecords = filterRecords(records, url).sort((left, right) =>
    right.date.localeCompare(left.date),
  )
  const { page, pageSize } = parsePagination(url)
  const startIndex = (page - 1) * pageSize

  return {
    data: filteredRecords
      .slice(startIndex, startIndex + pageSize)
      .map(sanitizeRecord),
    pagination: {
      page,
      pageSize,
      totalItems: filteredRecords.length,
      totalPages: Math.max(1, Math.ceil(filteredRecords.length / pageSize)),
    },
  }
}

async function handleCreateRecord(request, response, database, actor) {
  const body = await parseBody(request)
  const validatedRecord = validateRecordInput(body)
  const timestamp = new Date().toISOString()

  const newRecord = {
    id: `rec_${Date.now()}`,
    ...validatedRecord,
    createdBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  }

  database.records.push(newRecord)
  await writeDatabase(database)

  sendJson(response, 201, {
    message: 'Record created successfully.',
    record: sanitizeRecord(newRecord),
  })
}

async function handleUpdateRecord(request, response, database, recordId) {
  const body = await parseBody(request)
  const validatedRecord = validateRecordInput(body)
  const record = database.records.find((entry) => entry.id === recordId)

  if (!record || record.deletedAt) {
    throw createError(404, 'Record not found.')
  }

  Object.assign(record, validatedRecord, {
    updatedAt: new Date().toISOString(),
  })
  await writeDatabase(database)

  sendJson(response, 200, {
    message: 'Record updated successfully.',
    record: sanitizeRecord(record),
  })
}

async function handleDeleteRecord(response, database, recordId) {
  const record = database.records.find((entry) => entry.id === recordId)

  if (!record || record.deletedAt) {
    throw createError(404, 'Record not found.')
  }

  record.deletedAt = new Date().toISOString()
  record.updatedAt = record.deletedAt
  await writeDatabase(database)

  sendJson(response, 200, {
    message: 'Record archived successfully.',
    record: sanitizeRecord(record),
  })
}

async function handleCreateUser(request, response, database) {
  const body = await parseBody(request)
  const validatedUser = validateUserInput(body)

  if (database.users.some((user) => user.email === validatedUser.email)) {
    throw createError(409, 'A user with that email already exists.')
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    ...validatedUser,
    token: `${validatedUser.role}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }

  database.users.push(newUser)
  await writeDatabase(database)

  sendJson(response, 201, {
    message: 'User created successfully.',
    user: buildUserResponse(newUser),
    token: newUser.token,
  })
}

async function handleUpdateUser(request, response, database, userId) {
  const body = await parseBody(request)
  const validatedUser = validateUserInput(body)
  const user = database.users.find((entry) => entry.id === userId)

  if (!user) {
    throw createError(404, 'User not found.')
  }

  const emailTaken = database.users.some(
    (entry) => entry.email === validatedUser.email && entry.id !== user.id,
  )

  if (emailTaken) {
    throw createError(409, 'Another user already uses that email address.')
  }

  Object.assign(user, validatedUser)
  await writeDatabase(database)

  sendJson(response, 200, {
    message: 'User profile updated successfully.',
    user: buildUserResponse(user),
  })
}
