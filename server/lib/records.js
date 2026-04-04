import { createError } from './errors.js'

export function parsePagination(url) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(
    20,
    Math.max(1, Number(url.searchParams.get('pageSize') ?? 5) || 5),
  )

  return { page, pageSize }
}

export function sanitizeRecord(record) {
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

export function validateRecordInput(input) {
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

export function filterRecords(records, url) {
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

export function buildSummary(records) {
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

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}
