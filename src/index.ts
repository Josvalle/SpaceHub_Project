import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { createYoga, createSchema } from 'graphql-yoga'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './routes/auth.routes'
import spacesRoutes from './routes/spaces.routes'
import reservationsRoutes from './routes/reservations.routes'
import membershipsRoutes from './routes/memberships.routes'
import { resolvers } from './graphql/resolvers'
import { getUserFromToken } from './middleware/auth.middleware'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import openapi from './docs/openapi.json'
import { GraphQLContext } from './types'

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in the environment')
  process.exit(1)
}

const typeDefs = fs.readFileSync(path.join(process.cwd(), 'src', 'graphql', 'schema.graphql'), 'utf8')

const yoga = createYoga<{}, GraphQLContext>({
  schema: createSchema<GraphQLContext>({ typeDefs, resolvers }),
  graphqlEndpoint: '/api/graphql',
  context: ({ request }) => {
    const token = (request.headers.get('authorization') || '').replace('Bearer ', '')
    return { user: token ? getUserFromToken(token) : null }
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

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`SpaceHub API running on port ${PORT}`)
  console.log(`GraphQL playground: http://localhost:${PORT}/api/graphql`)
  console.log(`API docs: http://localhost:${PORT}/api/docs`)
})

export default app
