import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import { AppError } from '../lib/errors'
import { notifyAvailabilityChange } from '../lib/pubsub'
import { overlaps } from '../lib/availability'
import { getActiveSpace } from './space.service'
import { AuthUser, CreateBookingBody } from '../types'

const HOUR = 1000 * 60 * 60

const bookingInclude = {
  space: true,
  user: { select: { id: true, name: true, email: true } }
}

export const isSpaceAvailable = async (
  spaceId: number,
  start: Date,
  end: Date,
  db: Prisma.TransactionClient = prisma
) => {
  const conflicts = await db.booking.count({
    where: { spaceId, ...overlaps(start, end) }
  })
  return conflicts === 0
}

export const calculateTotalPrice = (pricePerHour: Prisma.Decimal, start: Date, end: Date) => {
  const hours = (end.getTime() - start.getTime()) / HOUR
  return pricePerHour.mul(hours).toFixed(2)
}

const canAccess =(user: AuthUser, booking: { userId: number }) => {
  return user.role === 'admin' || booking.userId === user.userId
}

export const getBooking = async (id: number, user: AuthUser) => {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude })

  if (!booking || !canAccess(user, booking)) {
    throw new AppError(404, 'Booking not found')
  }
  return booking
}

export const listBookings = (user: AuthUser) => {
  return prisma.booking.findMany({
    where: user.role === 'admin' ? {} : { userId: user.userId },
    include: bookingInclude,
    orderBy: { startTime: 'asc' }
  })
}

export const createBooking = async (user: AuthUser, data: CreateBookingBody) => {
  const space = await getActiveSpace(data.spaceId)

  const booking = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${space.id})`

    if (!(await isSpaceAvailable(space.id, data.startTime, data.endTime, tx))) {
      throw new AppError(409, 'The space is not available at that time')
    }

    return tx.booking.create({
      data: {
        userId: user.userId,
        spaceId: space.id,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'confirmed',
        totalPrice: calculateTotalPrice(space.pricePerHour, data.startTime, data.endTime)
      }
    })
  })

  notifyAvailabilityChange()
  return booking
}

export const cancelBooking = async (id: number, user: AuthUser) => {
  const booking = await getBooking(id, user)

  if (booking.status === 'canceled') {
    throw new AppError(409, 'The booking is already canceled')
  }

  const canceled = await prisma.booking.update({
    where: { id },
    data: { status: 'canceled' }
  })

  notifyAvailabilityChange()
  return canceled
}
