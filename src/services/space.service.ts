import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import { AppError } from '../lib/errors'
import { notifyAvailabilityChange } from '../lib/pubsub'
import { overlaps, isFullyBooked } from '../lib/availability'
import { CreateSpaceBody, UpdateSpaceBody, SpaceFilters, DateRange } from '../types'

const getDayRange = (date: string): DateRange => {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

const getTimeRange = (date: string, startTime: string, endTime: string): DateRange => ({
  start: new Date(`${date}T${startTime}:00.000Z`),
  end: new Date(`${date}T${endTime}:00.000Z`)
})

const buildWhere = (filters: Pick<SpaceFilters, 'type' | 'minCapacity'>): Prisma.SpaceWhereInput => ({
  isActive: true,
  ...(filters.type && { type: filters.type }),
  ...(filters.minCapacity && { capacity: { gte: filters.minCapacity } })
})

export const getActiveSpace = async (id: number) => {
  const space = await prisma.space.findUnique({ where: { id } })

  if (!space || !space.isActive) {
    throw new AppError(404, 'Space not found')
  }
  return space
}

export const listSpaces = async (filters: SpaceFilters) => {
  const where = buildWhere(filters)

  if (!filters.date) {
    return prisma.space.findMany({ where })
  }

  if (filters.startTime && filters.endTime) {
    const range = getTimeRange(filters.date, filters.startTime, filters.endTime)
    return prisma.space.findMany({
      where: { ...where, bookings: { none: overlaps(range.start, range.end) } }
    })
  }

  const day = getDayRange(filters.date)
  const spaces = await prisma.space.findMany({
    where,
    include: {
      bookings: {
        where: overlaps(day.start, day.end),
        select: { startTime: true, endTime: true }
      }
    }
  })

  return spaces
    .filter((space) => !isFullyBooked(space.bookings, day.start, day.end))
    .map(({ bookings, ...space }) => space)
}

export const getSpacesAvailability = async (range: DateRange, filters: Pick<SpaceFilters, 'type' | 'minCapacity'>) => {
  const spaces = await prisma.space.findMany({
    where: buildWhere(filters),
    include: {
      bookings: { where: overlaps(range.start, range.end), select: { id: true } }
    },
    orderBy: { id: 'asc' }
  })

  return spaces.map(({ bookings, ...space }) => ({
    space,
    available: bookings.length === 0
  }))
}

export const createSpace = async (data: CreateSpaceBody) => {
  const space = await prisma.space.create({ data: { ...data, isActive: true } })
  notifyAvailabilityChange()
  return space
}

export const updateSpace = async (id: number, data: UpdateSpaceBody) => {
  const space = await prisma.space.update({ where: { id }, data })
  notifyAvailabilityChange()
  return space
}

export const deactivateSpace = async (id: number) => {
  const space = await prisma.space.update({ where: { id }, data: { isActive: false } })
  notifyAvailabilityChange()
  return space
}
