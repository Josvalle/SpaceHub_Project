import { GraphQLError } from 'graphql'
import prisma from '../lib/prisma'
import { onBookingChange } from '../lib/pubsub'

const HOUR = 1000 * 60 * 60

const parseDate = (value: string, field: string) => {
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    throw new GraphQLError(`${field} is not a valid date`)
  }
  return date
}

const parseRange = (startValue: string, endValue: string) => {
  const start = parseDate(startValue, 'start')
  const end = parseDate(endValue, 'end')
  if (end <= start) {
    throw new GraphQLError('end must be after start')
  }
  return { start, end }
}

const formatSpace = (space: any) => ({
  ...space,
  pricePerHour: Number(space.pricePerHour)
})

const requireAdmin = (context: any) => {
  if (!context.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } })
  }
  if (context.user.role !== 'admin') {
    throw new GraphQLError('Admin role required', { extensions: { code: 'FORBIDDEN' } })
  }
}

const getAvailability = async (args: any) => {
  const { start, end } = parseRange(args.start, args.end)

  const spaces = await prisma.space.findMany({
    where: {
      isActive: true,
      ...(args.type && { type: args.type }),
      ...(args.minCapacity && { capacity: { gte: args.minCapacity } })
    },
    include: {
      bookings: {
        where: {
          status: { not: 'canceled' },
          startTime: { lt: end },
          endTime: { gt: start }
        },
        select: { id: true }
      }
    },
    orderBy: { id: 'asc' }
  })

  return spaces.map((space) => ({
    space: formatSpace(space),
    available: space.bookings.length === 0
  }))
}

const getOccupancy = async (from: Date, to: Date) => {
  const spaces = await prisma.space.findMany({ where: { isActive: true } })
  const bookings = await prisma.booking.findMany({
    where: {
      status: { not: 'canceled' },
      startTime: { lt: to },
      endTime: { gt: from }
    },
    include: { space: true }
  })

  const rangeHours = (to.getTime() - from.getTime()) / HOUR
  const groups: any = {}

  for (const space of spaces) {
    const key = `${space.location}|${space.type}`
    if (!groups[key]) {
      groups[key] = { location: space.location, type: space.type, totalSpaces: 0, bookedHours: 0 }
    }
    groups[key].totalSpaces += 1
  }

  for (const booking of bookings) {
    const key = `${booking.space.location}|${booking.space.type}`
    if (!groups[key]) continue
    const start = Math.max(booking.startTime.getTime(), from.getTime())
    const end = Math.min(booking.endTime.getTime(), to.getTime())
    groups[key].bookedHours += (end - start) / HOUR
  }

  return Object.values(groups).map((group: any) => ({
    ...group,
    occupancyRate: Number(((group.bookedHours / (group.totalSpaces * rangeHours)) * 100).toFixed(2))
  }))
}

const getRevenue = async (from: Date, to: Date, groupBy: string) => {
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'confirmed',
      startTime: { gte: from, lt: to }
    }
  })

  const length = groupBy === 'day' ? 10 : 7
  const periods: any = {}

  for (const booking of bookings) {
    const period = booking.startTime.toISOString().slice(0, length)
    if (!periods[period]) {
      periods[period] = { period, total: 0, bookings: 0 }
    }
    periods[period].total += Number(booking.totalPrice)
    periods[period].bookings += 1
  }

  return Object.values(periods).sort((a: any, b: any) => a.period.localeCompare(b.period))
}

const getExpiringMemberships = async (days: number) => {
  const now = new Date()
  const limit = new Date(now.getTime() + days * 24 * HOUR)

  const memberships = await prisma.membership.findMany({
    where: { endDate: { gte: now, lte: limit } },
    include: { user: true },
    orderBy: { endDate: 'asc' }
  })

  return memberships.map((membership) => ({
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    plan: membership.plan,
    endDate: membership.endDate.toISOString()
  }))
}

const getTopUsers = async (from: Date, to: Date, limit: number) => {
  const groups = await prisma.booking.groupBy({
    by: ['userId'],
    where: {
      status: { not: 'canceled' },
      startTime: { gte: from, lt: to }
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit
  })

  const users = await prisma.user.findMany({
    where: { id: { in: groups.map((group) => group.userId) } }
  })

  return groups.map((group) => {
    const user = users.find((u) => u.id === group.userId)
    return {
      userId: group.userId,
      name: user.name,
      email: user.email,
      bookings: group._count.id
    }
  })
}

export const resolvers = {
  Query: {
    spaces: async (_: any, { type, minCapacity }: any) => {
      const spaces = await prisma.space.findMany({
        where: {
          isActive: true,
          ...(type && { type }),
          ...(minCapacity && { capacity: { gte: minCapacity } })
        }
      })
      return spaces.map(formatSpace)
    },

    space: async (_: any, { id }: any) => {
      const space = await prisma.space.findUnique({ where: { id: parseInt(id) } })
      return space && space.isActive ? formatSpace(space) : null
    },

    spacesAvailability: (_: any, args: any) => getAvailability(args),

    analytics: async (_: any, args: any, context: any) => {
      requireAdmin(context)
      const { start: from, end: to } = parseRange(args.from, args.to)

      return {
        occupancy: await getOccupancy(from, to),
        revenue: await getRevenue(from, to, args.groupBy),
        membershipsExpiring: await getExpiringMemberships(args.expiresInDays),
        topUsers: await getTopUsers(from, to, args.topLimit)
      }
    }
  },

  Subscription: {
    spacesAvailability: {
      subscribe: async function* (_: any, args: any) {
        yield { spacesAvailability: await getAvailability(args) }

        for await (const change of onBookingChange()) {
          yield { spacesAvailability: await getAvailability(args) }
        }
      }
    }
  }
}
