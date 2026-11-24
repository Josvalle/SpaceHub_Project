import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import { createYoga, createSchema } from 'graphql-yoga'
import authRoutes from './routes/auth.routes'
import spacesRoutes from './routes/spaces.routes'
import reservationsRoutes from './routes/reservations.routes'
import membershipsRoutes from './routes/memberships.routes'
import swaggerUi from 'swagger-ui-express'
import { resolvers } from './graphql/resolvers'
import openapi from './docs/openapi.json'

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in the environment')
  process.exit(1)
}

const typeDefs = fs.readFileSync(path.join(process.cwd(), 'src', 'graphql', 'schema.graphql'), 'utf8')

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/api/graphql',
  context: ({ request }) => {
    const token = (request.headers.get('authorization') || '').replace('Bearer ', '')
    let user = null
    try {
      user = token ? jwt.verify(token, process.env.JWT_SECRET as string) : null
    } catch (error) {
      user = null
    }
    return { user }
  }
})

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use('/api/graphql', yoga)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'SpaceHub API is running' })
})

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi))

app.use('/api/auth', authRoutes)
app.use('/api/spaces', spacesRoutes)
app.use('/api/reservations', reservationsRoutes)
app.use('/api/memberships', membershipsRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`SpaceHub API running on port ${PORT}`)
  console.log(`GraphQL playground: http://localhost:${PORT}/api/graphql`)
  console.log(`API docs: http://localhost:${PORT}/api/docs`)
})

export default app
