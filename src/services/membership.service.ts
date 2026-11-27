import { Plan } from '@prisma/client'
import prisma from '../lib/prisma'

export const listActiveMemberships = () => {
  return prisma.membership.findMany({
    where: { endDate: { gt: new Date() } },
    include: { user: { select: { id: true, name: true, email: true } } }
  })
}

export const updatePlan = (userId: number, plan: Plan) => {
  return prisma.membership.update({ where: { userId }, data: { plan } })
}
