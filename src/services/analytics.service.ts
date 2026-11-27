import prisma from '../lib/prisma'
import { overlaps } from '../lib/availability'
import { DateRange } from '../types'

const HOUR = 1000 * 60 * 60

export type GroupBy = 'day' | 'month'

interface OccupancyGroup {
  location: string
  type: string
  totalSpaces: number
  bookedHours: number
}

export interface AnalyticsOptions {
  range: DateRange
  groupBy: GroupBy
  expiresInDays: number
  topLimit: number
}

const getOccupancy = async ({ start, end }: DateRange) => {
  const [spaces, bookings] = await Promise.all([
    prisma.space.findMany({ where: { isActive: true } }),
    prisma.booking.findMany({ where: overlaps(start, end), include: { space: true } })
  ])

  const rangeHours = (end.getTime() - start.getTime()) / HOUR
  const groups: Record<string, OccupancyGroup> = {}

  for (const space of spaces) {
    const key = `${space.location}|${space.type}`
    if (!groups[key]) {
      groups[key] = { location: space.location, type: space.type, totalSpaces: 0, bookedHours: 0 }
    }
    groups[key].totalSpaces += 1
  }

  for (const booking of bookings) {
    const group = groups[`${booking.space.location}|${booking.space.type}`]
    if (!group) continue
    const from = Math.max(booking.startTime.getTime(), start.getTime())
    const to = Math.min(booking.endTime.getTime(), end.getTime())
    group.bookedHours += (to - from) / HOUR
  }

  return Object.values(groups).map((group) => ({
    ...group,
    occupancyRate: Number(((group.bookedHours / (group.totalSpaces * rangeHours)) * 100).toFixed(2))
  }))
}

const getRevenue = async ({ start, end }: DateRange, groupBy: GroupBy) => {
  const bookings = await prisma.booking.findMany({
    where: { status: 'confirmed', startTime: { gte: start, lt: end } }
  })

  const length = groupBy === 'day' ? 10 : 7
  const periods: Record<string, { period: string; total: number; bookings: number }> = {}

  for (const booking of bookings) {
    const period = booking.startTime.toISOString().slice(0, length)
    if (!periods[period]) {
      periods[period] = { period, total: 0, bookings: 0 }
    }
    periods[period].total += Number(booking.totalPrice)
    periods[period].bookings += 1
  }

  return Object.values(periods).sort((a, b) => a.period.localeCompare(b.period))
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

const getTopUsers = async ({ start, end }: DateRange, limit: number) => {
  const groups = await prisma.booking.groupBy({
    by: ['userId'],
    where: { status: { not: 'canceled' }, startTime: { gte: start, lt: end } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit
  })

  const users = await prisma.user.findMany({
    where: { id: { in: groups.map((group) => group.userId) } }
  })

  return groups.flatMap((group) => {
    const user = users.find((u) => u.id === group.userId)
    if (!user) return []
    return [{ userId: user.id, name: user.name, email: user.email, bookings: group._count.id }]
  })
}

export const getAnalytics = async ({ range, groupBy, expiresInDays, topLimit }: AnalyticsOptions) => {
  const [occupancy, revenue, membershipsExpiring, topUsers] = await Promise.all([
    getOccupancy(range),
    getRevenue(range, groupBy),
    getExpiringMemberships(expiresInDays),
    getTopUsers(range, topLimit)
  ])

  return { occupancy, revenue, membershipsExpiring, topUsers }
}
