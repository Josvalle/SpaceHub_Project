import { Prisma } from '@prisma/client'

export class AppError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const isUniqueError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export const isNotFoundError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export const isOverlapError = (error: unknown) => {
  return error instanceof Prisma.PrismaClientUnknownRequestError && error.message.includes('23P01')
}