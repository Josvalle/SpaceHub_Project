import { Request, Response } from 'express'
import * as authService from '../services/auth.service'
import { parseRegister, parseLogin } from '../lib/validation'

export const register = async (req: Request, res: Response) => {
  const result = await authService.register(parseRegister(req.body))
  res.status(201).json(result)
}

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(parseLogin(req.body))
  res.json(result)
}
