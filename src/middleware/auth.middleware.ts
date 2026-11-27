import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import { AuthUser } from '../types'

export const getUserFromToken = (token: string): AuthUser | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string)

    if (typeof decoded === 'string') {
      return null
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role }
  } catch (error) {
    return null
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token required' })
  }

  const user = getUserFromToken(authHeader.split(' ')[1])

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = user
  next()
}

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' })
    }
    next()
  }
}
