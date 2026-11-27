import { Request, Response } from 'express'
import * as spaceService from '../services/space.service'
import { parseSpaceFilters, parseCreateSpace, parseUpdateSpace } from '../lib/validation'

export const list = async (req: Request, res: Response) => {
  const spaces = await spaceService.listSpaces(parseSpaceFilters(req.query))
  res.json(spaces)
}

export const get = async (req: Request, res: Response) => {
  const space = await spaceService.getActiveSpace(Number(req.params.id))
  res.json(space)
}

export const create = async (req: Request, res: Response) => {
  const space = await spaceService.createSpace(parseCreateSpace(req.body))
  res.status(201).json(space)
}

export const update = async (req: Request, res: Response) => {
  const space = await spaceService.updateSpace(Number(req.params.id), parseUpdateSpace(req.body))
  res.json(space)
}

export const deactivate = async (req: Request, res: Response) => {
  const space = await spaceService.deactivateSpace(Number(req.params.id))
  res.json(space)
}
