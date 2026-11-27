import { Request, Response } from 'express'
import * as membershipService from '../services/membership.service'
import { AppError } from '../lib/errors'
import { isPlan } from '../lib/validation'

export const list = async (req: Request, res: Response) => {
  const memberships = await membershipService.listActiveMemberships()
  res.json(memberships)
}

export const updatePlan = async (req: Request, res: Response) => {
  const { plan } = req.body || {}

  if (!isPlan(plan)) {
    throw new AppError(400, 'plan must be basic, pro or enterprise')
  }

  const membership = await membershipService.updatePlan(Number(req.params.userId), plan)
  res.json(membership)
}
