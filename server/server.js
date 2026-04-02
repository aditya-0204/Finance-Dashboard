import http from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDirectory = path.join(__dirname, 'data')
const dataFile = path.join(dataDirectory, 'storage.json')
const port = Number(process.env.PORT ?? 4000)

const rolePermissions = {
  viewer: ['summary:read'],
  analyst: ['summary:read', 'records:read'],
  admin: ['summary:read', 'records:read', 'records:write', 'users:manage'],
}

const seedDatabase = {
  users: [
    {
      id: 'usr_admin_1',
      name: 'Ariana Finance',
      email: 'admin@finboard.local',
      role: 'admin',
      status: 'active',
      token: 'admin-token',
      createdAt: '2026-03-20T08:00:00.000Z',
    },
    {
      id: 'usr_analyst_1',
      name: 'Mason Analyst',
      email: 'analyst@finboard.local',
      role: 'analyst',
      status: 'active',
      token: 'analyst-token',
      createdAt: '2026-03-20T08:10:00.000Z',
    },
    {
      id: 'usr_viewer_1',
      name: 'Priya Viewer',
      email: 'viewer@finboard.local',
      role: 'viewer',
      status: 'active',
      token: 'viewer-token',
      createdAt: '2026-03-20T08:20:00.000Z',
    },
    {
      id: 'usr_inactive_1',
      name: 'Nora Former User',
      email: 'inactive@finboard.local',
      role: 'viewer',
      status: 'inactive',
      token: 'inactive-token',
      createdAt: '2026-03-20T08:30:00.000Z',
    },
  ],
  records: [
    {
      id: 'rec_1001',
      amount: 8200,
      type: 'income',
      category: 'Consulting',
      date: '2026-01-05',
      notes: 'Quarterly consulting retainer',
      createdBy: 'usr_admin_1',
      createdAt: '2026-01-05T10:00:00.000Z',
      updatedAt: '2026-01-05T10:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'rec_1002',
      amount: 1450,
      type: 'expense',
      category: 'Software',
      date: '2026-01-09',
      notes: 'Productivity and analytics subscriptions',
      createdBy: 'usr_admin_1',
      createdAt: '2026-01-09T10:00:00.000Z',
      updatedAt: '2026-01-09T10:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'rec_1003',
      amount: 4300,
      type: 'income',
      category: 'Investments',
      date: '2026-02-11',
      notes: 'Dividend and bond income',
      createdBy: 'usr_admin_1',
      createdAt: '2026-02-11T10:00:00.000Z',
      updatedAt: '2026-02-11T10:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'rec_1004',
      amount: 2100,
      type: 'expense',
      category: 'Payroll',
      date: '2026-02-18',
      notes: 'Part-time finance support',
      createdBy: 'usr_admin_1',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'rec_1005',
      amount: 6100,
      type: 'income',
      category: 'Sales',
      date: '2026-03-04',
      notes: 'Enterprise dashboard subscription',
      createdBy: 'usr_admin_1',
      createdAt: '2026-03-04T10:00:00.000Z',
      updatedAt: '2026-03-04T10:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'rec_1006',
      amount: 1250,
      type: 'expense',
      category: 'Travel',
      date: '2026-03-12',
      notes: 'Client workshop travel',
      createdBy: 'usr_admin_1',
      createdAt: '2026-03-12T10:00:00.000Z',
      updatedAt: '2026-03-12T10:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'rec_1007',
      amount: 900,
      type: 'expense',
      category: 'Marketing',
      date: '2026-03-21',
      notes: 'Campaign spend',
      createdBy: 'usr_admin_1',
      createdAt: '2026-03-21T10:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'rec_1008',
      amount: 2400,
      type: 'income',
      category: 'Services',
      date: '2026-03-25',
      notes: 'Advisory workshop package',
      createdBy: 'usr_admin_1',
      createdAt: '2026-03-25T10:00:00.000Z',
      updatedAt: '2026-03-25T10:00:00.000Z',
      deletedAt: null,
    },
  ],
}

let writeQueue = Promise.resolve()

await ensureDatabase()

function buildUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    permissions: rolePermissions[user.role],
  }
}

async function ensureDatabase() {
  await mkdir(dataDirectory, { recursive: true })

  try {
    await readFile(dataFile, 'utf8')
  } catch {
    await writeFile(dataFile, JSON.stringify(seedDatabase, null, 2))
  }
}

async function readDatabase() {
  const raw = await readFile(dataFile, 'utf8')
  return JSON.parse(raw)
}

function writeDatabase(nextDatabase) {
  writeQueue = writeQueue.then(() =>
    writeFile(dataFile, JSON.stringify(nextDatabase, null, 2)),
  )

  return writeQueue
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Auth-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  })
  response.end(JSON.stringify(payload))
}

async function parseBody(request) {
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

function createError(status, message, details) {
  return { status, message, details }
}

function getTokenFromRequest(request) {
  const authorization = request.headers.authorization

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim()
  }

  const customToken = request.headers['x-auth-token']

  if (typeof customToken === 'string') {
    return customToken.trim()
  }

  return null
}

function requirePermission(actor, permission) {
  if (!actor) {
    throw createError(401, 'Authentication is required for this endpoint.')
  }

  if (actor.status !== 'active') {
    throw createError(403, 'This user account is inactive.')
  }

  if (!rolePermissions[actor.role]?.includes(permission)) {
    throw createError(403, 'You do not have permission to perform this action.')
  }
}

function parsePagination(url) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(
    20,
    Math.max(1, Number(url.searchParams.get('pageSize') ?? 5) || 5),
  )

  return { page, pageSize }
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

function sanitizeRecord(record) {
  return {
    id: record.id,
    amount: record.amount,
    type: record.type,
    category: record.category,
    date: record.date,
    notes: record.notes,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  }
}

function validateRecordInput(input) {
  const errors = {}
  const normalizedType = String(input.type ?? '').trim().toLowerCase()
  const normalizedCategory = String(input.category ?? '').trim()
  const normalizedDate = String(input.date ?? '').trim()
  const normalizedNotes = String(input.notes ?? '').trim()
  const amount = Number(input.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be a positive number.'
  }

  if (!['income', 'expense'].includes(normalizedType)) {
    errors.type = 'Type must be either income or expense.'
  }

  if (normalizedCategory.length < 2) {
    errors.category = 'Category must be at least 2 characters long.'
  }

  if (!isValidDate(normalizedDate)) {
    errors.date = 'Date must use the YYYY-MM-DD format.'
  }

  if (normalizedNotes.length > 240) {
    errors.notes = 'Notes must be 240 characters or fewer.'
  }

  if (Object.keys(errors).length > 0) {
    throw createError(422, 'Record validation failed.', errors)
  }

  return {
    amount,
    type: normalizedType,
    category: normalizedCategory,
    date: normalizedDate,
    notes: normalizedNotes,
  }
}

function validateUserInput(input) {
  const errors = {}
  const name = String(input.name ?? '').trim()
  const email = String(input.email ?? '').trim().toLowerCase()
  const role = String(input.role ?? '').trim().toLowerCase()
  const status = String(input.status ?? '').trim().toLowerCase()

  if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters long.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email must be valid.'
  }

  if (!Object.keys(rolePermissions).includes(role)) {
    errors.role = 'Role must be viewer, analyst, or admin.'
  }

  if (!['active', 'inactive'].includes(status)) {
    errors.status = 'Status must be active or inactive.'
  }

  if (Object.keys(errors).length > 0) {
    throw createError(422, 'User validation failed.', errors)
  }

  return { name, email, role, status }
}

function filterRecords(records, url) {
  const type = url.searchParams.get('type')
  const category = url.searchParams.get('category')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const includeDeleted = url.searchParams.get('includeDeleted') === 'true'

  return records.filter((record) => {
    if (!includeDeleted && record.deletedAt) {
      return false
    }

    if (type && record.type !== type) {
      return false
    }

    if (category && record.category.toLowerCase() !== category.toLowerCase()) {
      return false
    }

    if (dateFrom && record.date < dateFrom) {
      return false
    }

    if (dateTo && record.date > dateTo) {
      return false
    }

    return true
  })
}

function buildSummary(records) {
  const activeRecords = records.filter((record) => !record.deletedAt)
  const income = activeRecords
    .filter((record) => record.type === 'income')
    .reduce((sum, record) => sum + record.amount, 0)
  const expenses = activeRecords
    .filter((record) => record.type === 'expense')
    .reduce((sum, record) => sum + record.amount, 0)

  const categoryTotalsMap = new Map()
  for (const record of activeRecords) {
    const current = categoryTotalsMap.get(record.category) ?? {
      category: record.category,
      income: 0,
      expenses: 0,
      total: 0,
    }

    if (record.type === 'income') {
      current.income += record.amount
      current.total += record.amount
    } else {
      current.expenses += record.amount
      current.total -= record.amount
    }

    categoryTotalsMap.set(record.category, current)
  }

  const monthlyTrendsMap = new Map()
  for (const record of activeRecords) {
    const month = record.date.slice(0, 7)
    const current = monthlyTrendsMap.get(month) ?? {
      month,
      income: 0,
      expenses: 0,
      net: 0,
    }

    if (record.type === 'income') {
      current.income += record.amount
      current.net += record.amount
    } else {
      current.expenses += record.amount
      current.net -= record.amount
    }

    monthlyTrendsMap.set(month, current)
  }

  const recentActivity = [...activeRecords]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5)
    .map(sanitizeRecord)

  return {
    totals: {
      income,
      expenses,
      netBalance: income - expenses,
      recordsCount: activeRecords.length,
    },
    categoryTotals: [...categoryTotalsMap.values()].sort((left, right) =>
      left.category.localeCompare(right.category),
    ),
    monthlyTrends: [...monthlyTrendsMap.values()].sort((left, right) =>
      left.month.localeCompare(right.month),
    ),
    recentActivity,
  }
}

async function handleRequest(request, response) {
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
      message: 'Login successful.',
      token: user.token,
      user: buildUserResponse(user),
    })
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

    const filteredRecords = filterRecords(database.records, url).sort((left, right) =>
      right.date.localeCompare(left.date),
    )
    const { page, pageSize } = parsePagination(url)
    const startIndex = (page - 1) * pageSize
    const paginatedRecords = filteredRecords
      .slice(startIndex, startIndex + pageSize)
      .map(sanitizeRecord)

    sendJson(response, 200, {
      data: paginatedRecords,
      pagination: {
        page,
        pageSize,
        totalItems: filteredRecords.length,
        totalPages: Math.max(1, Math.ceil(filteredRecords.length / pageSize)),
      },
    })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/records') {
    requirePermission(actor, 'records:write')
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
    return
  }

  const recordIdMatch = url.pathname.match(/^\/api\/records\/([^/]+)$/)

  if (recordIdMatch && request.method === 'PUT') {
    requirePermission(actor, 'records:write')
    const body = await parseBody(request)
    const validatedRecord = validateRecordInput(body)
    const record = database.records.find((entry) => entry.id === recordIdMatch[1])

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
    return
  }

  if (recordIdMatch && request.method === 'DELETE') {
    requirePermission(actor, 'records:write')
    const record = database.records.find((entry) => entry.id === recordIdMatch[1])

    if (!record || record.deletedAt) {
      throw createError(404, 'Record not found.')
    }

    record.deletedAt = new Date().toISOString()
    record.updatedAt = record.deletedAt
    await writeDatabase(database)

    sendJson(response, 200, {
      message: 'Record soft-deleted successfully.',
      record: sanitizeRecord(record),
    })
    return
  }

  const userIdMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/)

  if (userIdMatch && request.method === 'PUT') {
    requirePermission(actor, 'users:manage')
    const body = await parseBody(request)
    const validatedUser = validateUserInput(body)
    const user = database.users.find((entry) => entry.id === userIdMatch[1])

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
      message: 'User updated successfully.',
      user: buildUserResponse(user),
    })
    return
  }

  throw createError(404, 'Endpoint not found.')
}

const server = http.createServer(async (request, response) => {
  try {
    await handleRequest(request, response)
  } catch (error) {
    const status = error.status ?? 500
    sendJson(response, status, {
      error: error.message ?? 'Internal server error.',
      details: error.details ?? null,
    })
  }
})

server.listen(port, () => {
  console.log(`Finance dashboard API is running on http://localhost:${port}`)
})
