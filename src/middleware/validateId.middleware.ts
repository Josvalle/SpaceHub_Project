import { Request, Response, NextFunction } from 'express'

export const validateId = (param: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params[param])

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: `Invalid ${param}` })
    }
    next()
  }
}
