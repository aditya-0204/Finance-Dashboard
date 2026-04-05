import { buildUserResponse } from '../lib/auth.js'
import { createError } from '../lib/errors.js'
import { validateUserInput } from '../lib/users.js'

export function findUserByToken(database, token) {
  return database.users.find((user) => user.token === token) ?? null
}

export function findUserByEmail(database, email) {
  return (
    database.users.find(
      (user) => user.email === String(email ?? '').trim().toLowerCase(),
    ) ?? null
  )
}

export function listUsers(database) {
  return database.users.map(buildUserResponse)
}

export function createUser(database, input) {
  const validatedUser = validateUserInput(input)

  if (findUserByEmail(database, validatedUser.email)) {
    throw createError(409, 'A user with that email already exists.')
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    ...validatedUser,
    token: `${validatedUser.role}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }

  database.users.push(newUser)

  return newUser
}

export function updateUser(database, userId, input) {
  const validatedUser = validateUserInput(input)
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

  return user
}
