import { createError } from '../lib/errors.js'
import {
  buildSummary,
  filterRecords,
  parsePagination,
  sanitizeRecord,
  validateRecordInput,
} from '../lib/records.js'

export function listRecords(database, url) {
  const filteredRecords = filterRecords(database.records, url).sort(
    (left, right) => right.date.localeCompare(left.date),
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

export function createRecord(database, actor, input) {
  const validatedRecord = validateRecordInput(input)
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

  return newRecord
}

export function updateRecord(database, recordId, input) {
  const validatedRecord = validateRecordInput(input)
  const record = database.records.find((entry) => entry.id === recordId)

  if (!record || record.deletedAt) {
    throw createError(404, 'Record not found.')
  }

  Object.assign(record, validatedRecord, {
    updatedAt: new Date().toISOString(),
  })

  return record
}

export function archiveRecord(database, recordId) {
  const record = database.records.find((entry) => entry.id === recordId)

  if (!record || record.deletedAt) {
    throw createError(404, 'Record not found.')
  }

  record.deletedAt = new Date().toISOString()
  record.updatedAt = record.deletedAt

  return record
}

export function getSummary(database) {
  return buildSummary(database.records)
}

export function toRecordResponse(record) {
  return sanitizeRecord(record)
}
