import process from 'node:process'

export const port = Number(process.env.PORT ?? 4000)

export const rolePermissions = {
  viewer: ['summary:read'],
  analyst: ['summary:read', 'records:read'],
  admin: ['summary:read', 'records:read', 'records:write', 'users:manage'],
}
