import { rolePermissions } from '../config.js'
import { createError } from './errors.js'

export function validateUserInput(input) {
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
