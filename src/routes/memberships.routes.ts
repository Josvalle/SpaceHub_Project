import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()

const plans = ['basic', 'pro', 'enterprise']

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { endDate: { gt: new Date() } },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    res.json(memberships)
  } catch (error) {
    res.status(500).json({ error: 'Could not get the memberships' })
  }
})

router.patch('/:userId', authenticate, authorize('admin'), async (req, res) => {
  const userId = parseInt(req.params.userId)
  const { plan } = req.body

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  if (!plans.includes(plan)) {
    return res.status(400).json({ error: 'plan must be basic, pro or enterprise' })
  }

  try {
    const membership = await prisma.membership.findUnique({ where: { userId } })

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' })
    }

    const updated = await prisma.membership.update({
      where: { userId },
      data: { plan }
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Could not update the membership' })
  }
})

export default router
