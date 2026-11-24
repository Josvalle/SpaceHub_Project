import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth.middleware'
import { notifyBookingChange } from '../lib/pubsub'

const router = Router()

const bookingInclude = {
  space: true,
  user: { select: { id: true, name: true, email: true } }
}

const canAccess = (user: any, booking: any) => {
  return user.role === 'admin' || booking.userId === user.userId
}

router.post('/', authenticate, async (req, res) => {
  const { spaceId, startTime, endTime } = req.body
  const userId = req.user.userId

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (!spaceId || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'spaceId, startTime and endTime are required and must be valid' })
  }

  if (end <= start) {
    return res.status(400).json({ error: 'endTime must be after startTime' })
  }

  try {
    const space = await prisma.space.findUnique({
      where: { id: parseInt(spaceId) }
    })

    if (!space || !space.isActive) {
      return res.status(404).json({ error: 'Space not found or inactive' })
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        spaceId: space.id,
        startTime: { lt: end },
        endTime: { gt: start },
        status: { not: 'canceled' }
      }
    })

    if (conflict) {
      return res.status(409).json({ error: 'The space is not available at that time' })
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600)
    const totalPrice = (durationHours * Number(space.pricePerHour)).toFixed(2)

    const booking = await prisma.booking.create({
      data: {
        userId,
        spaceId: space.id,
        startTime: start,
        endTime: end,
        status: 'confirmed',
        totalPrice
      }
    })

    notifyBookingChange(space.id)
    res.status(201).json(booking)
  } catch (error: any) {
    if (String(error.message).includes('Booking_no_overlap')) {
      return res.status(409).json({ error: 'The space is not available at that time' })
    }
    res.status(500).json({ error: 'Could not create the booking' })
  }
})

router.get('/', authenticate, async (req, res) => {
  const where = req.user.role === 'admin' ? {} : { userId: req.user.userId }

  try {
    const bookings = await prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { startTime: 'asc' }
    })
    res.json(bookings)
  } catch (error) {
    res.status(500).json({ error: 'Could not get the bookings' })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid booking id' })
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: bookingInclude
    })

    if (!booking || !canAccess(req.user, booking)) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    res.json(booking)
  } catch (error) {
    res.status(500).json({ error: 'Could not get the booking' })
  }
})

router.patch('/:id/cancel', authenticate, async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid booking id' })
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id } })

    if (!booking || !canAccess(req.user, booking)) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (booking.status === 'canceled') {
      return res.status(409).json({ error: 'The booking is already canceled' })
    }

    const canceled = await prisma.booking.update({
      where: { id },
      data: { status: 'canceled' }
    })

    notifyBookingChange(canceled.spaceId)
    res.json(canceled)
  } catch (error) {
    res.status(500).json({ error: 'Could not cancel the booking' })
  }
})

export default router
