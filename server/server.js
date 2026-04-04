import http from 'node:http'
import { port } from './config.js'
import { sendJson } from './lib/http.js'
import { ensureDatabase } from './lib/storage.js'
import { handleRequest } from './routes.js'

await ensureDatabase()

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
