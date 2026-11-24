import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()

const spaceTypes = ['desk', 'private_room', 'suite']

const validateSpace = (body: any, partial: boolean) => {
  const { name, type, capacity, pricePerHour, location } = body

  if (!partial && (!name || !type || !capacity || !pricePerHour || !location)) {
    return 'name, type, capacity, pricePerHour and location are required'
  }
  if (type !== undefined && !spaceTypes.includes(type)) {
    return 'type must be desk, private_room or suite'
  }
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) {
    return 'capacity must be a positive integer'
  }
  if (pricePerHour !== undefined && (typeof pricePerHour !== 'number' || pricePerHour <= 0)) {
    return 'pricePerHour must be a positive number'
  }
  return null
}

router.get('/', async (req, res) => {
  const { type, minCapacity, date } = req.query

  const filters: any = { isActive: true }

  if (type) {
    if (!spaceTypes.includes(type as string)) {
      return res.status(400).json({ error: 'type must be desk, private_room or suite' })
    }
    filters.type = type
  }

  if (minCapacity) {
    const min = parseInt(minCapacity as string)
    if (isNaN(min)) {
      return res.status(400).json({ error: 'minCapacity must be a number' })
    }
    filters.capacity = { gte: min }
  }

  if (date) {
    const dayStart = new Date(`${date}T00:00:00.000Z`)
    if (isNaN(dayStart.getTime())) {
      return res.status(400).json({ error: 'date must have the format YYYY-MM-DD' })
    }
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    filters.bookings = {
      none: {
        status: { not: 'canceled' },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart }
      }
    }
  }

  try {
    const spaces = await prisma.space.findMany({ where: filters })
    res.json(spaces)
  } catch (error) {
    res.status(500).json({ error: 'Could not get the spaces' })
  }
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid space id' })
  }

  try {
    const space = await prisma.space.findUnique({ where: { id } })

    if (!space || !space.isActive) {
      return res.status(404).json({ error: 'Space not found' })
    }

    res.json(space)
  } catch (error) {
    res.status(500).json({ error: 'Could not get the space' })
  }
})

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, type, capacity, pricePerHour, location } = req.body

  const problem = validateSpace(req.body, false)
  if (problem) {
    return res.status(400).json({ error: problem })
  }

  try {
    const space = await prisma.space.create({
      data: { name, type, capacity, pricePerHour, location, isActive: true }
    })
    res.status(201).json(space)
  } catch (error) {
    res.status(500).json({ error: 'Could not create the space' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid space id' })
  }

  const problem = validateSpace(req.body, true)
  if (problem) {
    return res.status(400).json({ error: problem })
  }

  const { name, type, capacity, pricePerHour, location, isActive } = req.body

  try {
    const exists = await prisma.space.findUnique({ where: { id } })

    if (!exists) {
      return res.status(404).json({ error: 'Space not found' })
    }

    const space = await prisma.space.update({
      where: { id },
      data: { name, type, capacity, pricePerHour, location, isActive }
    })
    res.json(space)
  } catch (error) {
    res.status(500).json({ error: 'Could not update the space' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = parseInt(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid space id' })
  }

  try {
    const exists = await prisma.space.findUnique({ where: { id } })

    if (!exists) {
      return res.status(404).json({ error: 'Space not found' })
    }

    const space = await prisma.space.update({
      where: { id },
      data: { isActive: false }
    })
    res.json(space)
  } catch (error) {
    res.status(500).json({ error: 'Could not deactivate the space' })
  }
})

export default router
