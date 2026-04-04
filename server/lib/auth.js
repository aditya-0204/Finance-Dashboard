import { rolePermissions } from '../config.js'
import { createError } from './errors.js'

export function buildUserResponse(user) {
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

export function getTokenFromRequest(request) {
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

export function requirePermission(actor, permission) {
  if (!actor) {
    throw createError(401, 'Authentication is required to access this resource.')
  }

  if (actor.status !== 'active') {
    throw createError(403, 'This account is inactive.')
  }

  if (!rolePermissions[actor.role]?.includes(permission)) {
    throw createError(403, 'You do not have permission to perform this action.')
  }
}
