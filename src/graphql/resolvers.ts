import { GraphQLError } from 'graphql'
import { Space } from '@prisma/client'
import { AppError } from '../lib/errors'
import { onAvailabilityChange } from '../lib/pubsub'
import { isSpaceType, parseDateRange } from '../lib/validation'
import * as spaceService from '../services/space.service'
import { getAnalytics, GroupBy } from '../services/analytics.service'
import { GraphQLContext, SpaceFilters } from '../types'

interface SpacesArgs {
  type?: string | null
  minCapacity?: number | null
}

interface AvailabilityArgs extends SpacesArgs {
  start: string
  end: string
}

interface AnalyticsArgs {
  from: string
  to: string
  groupBy: GroupBy
  expiresInDays: number
  topLimit: number
}

const toGraphQLError = (error: unknown) => {
  if (error instanceof AppError) {
    return new GraphQLError(error.message, { extensions: { status: error.status } })
  }
  return error
}

const guard = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => {
  return async (...args: A) => {
    try {
      return await fn(...args)
    } catch (error) {
      throw toGraphQLError(error)
    }
  }
}

const formatSpace = (space: Space) => ({
  ...space,
  pricePerHour: Number(space.pricePerHour)
})

const toFilters = ({ type, minCapacity }: SpacesArgs): SpaceFilters => {
  if (type && !isSpaceType(type)) {
    throw new AppError(400, 'type must be desk, private_room or suite')
  }
  return {
    ...(type && isSpaceType(type) && { type }),
    ...(minCapacity && { minCapacity })
  }
}

const requireAdmin = (context: GraphQLContext) => {
  if (!context.user) {
    throw new AppError(401, 'Authentication required')
  }
  if (context.user.role !== 'admin') {
    throw new AppError(403, 'Admin role required')
  }
}

const getAvailability = async (args: AvailabilityArgs) => {
  const range = parseDateRange(args.start, args.end)
  const items = await spaceService.getSpacesAvailability(range, toFilters(args))
  return items.map((item) => ({ ...item, space: formatSpace(item.space) }))
}

export const resolvers = {
  Query: {
    spaces: guard(async (_: unknown, args: SpacesArgs) => {
      const spaces = await spaceService.listSpaces(toFilters(args))
      return spaces.map(formatSpace)
    }),

    space: guard(async (_: unknown, { id }: { id: string }) => {
      try {
        return formatSpace(await spaceService.getActiveSpace(Number(id)))
      } catch (error) {
        if (error instanceof AppError && error.status === 404) return null
        throw error
      }
    }),

    spacesAvailability: guard((_: unknown, args: AvailabilityArgs) => getAvailability(args)),

    analytics: guard(async (_: unknown, args: AnalyticsArgs, context: GraphQLContext) => {
      requireAdmin(context)
      return getAnalytics({
        range: parseDateRange(args.from, args.to),
        groupBy: args.groupBy,
        expiresInDays: args.expiresInDays,
        topLimit: args.topLimit
      })
    })
  },

  Subscription: {
    spacesAvailability: {
      subscribe: async function* (_: unknown, args: AvailabilityArgs) {
        try {
          yield { spacesAvailability: await getAvailability(args) }

          for await (const _change of onAvailabilityChange()) {
            yield { spacesAvailability: await getAvailability(args) }
          }
        } catch (error) {
          throw toGraphQLError(error)
        }
      }
    }
  }
}
