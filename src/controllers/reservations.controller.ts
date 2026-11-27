import { Request, Response } from 'express'
import * as bookingService from '../services/booking.service'
import { parseCreateBooking } from '../lib/validation'

export const create = async (req: Request, res: Response) => {
  const booking = await bookingService.createBooking(req.user!, parseCreateBooking(req.body))
  res.status(201).json(booking)
}

export const list = async (req: Request, res: Response) => {
  const bookings = await bookingService.listBookings(req.user!)
  res.json(bookings)
}

export const get = async (req: Request, res: Response) => {
  const booking = await bookingService.getBooking(Number(req.params.id), req.user!)
  res.json(booking)
}

export const cancel = async (req: Request, res: Response) => {
  const booking = await bookingService.cancelBooking(Number(req.params.id), req.user!)
  res.json(booking)
}
