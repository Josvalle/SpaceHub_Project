import { Request, Response, NextFunction } from 'express'
import { AppError, isUniqueError, isNotFoundError, isOverlapError } from '../lib/errors'

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export const asyncHandler = (handler: Handler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message })
  }

  if (isUniqueError(err)) {
    const fields = err.meta?.target
    const isEmail = Array.isArray(fields) && fields.includes('email')
    return res.status(409).json({ error: isEmail ? 'Email already registered' : 'The resource already exists' })
  }

  if (isNotFoundError(err)) {
    return res.status(404).json({ error: 'Resource not found' })
  }

  if (isOverlapError(err)) {
    return res.status(409).json({ error: 'The space is not available at that time' })
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
