import { SpaceType, Plan } from '@prisma/client'
import { AppError } from './errors'
import {
  RegisterBody,
  LoginBody,
  CreateSpaceBody,
  UpdateSpaceBody,
  SpaceFilters,
  CreateBookingBody,
  DateRange
} from '../types'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const badRequest = (message: string) => new AppError(400, message)

const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined)

export const isSpaceType = (value: unknown): value is SpaceType => {
  return Object.values(SpaceType).includes(value as SpaceType)
}

export const isPlan = (value: unknown): value is Plan => {
  return Object.values(Plan).includes(value as Plan)
}

export const parseDate = (value: unknown, field: string) => {
  const date = new Date(value as string)
  if (!value || isNaN(date.getTime())) {
    throw badRequest(`${field} is not a valid date`)
  }
  return date
}

export const parseDateRange = (startValue: unknown, endValue: unknown): DateRange => {
  const start = parseDate(startValue, 'start')
  const end = parseDate(endValue, 'end')
  if (end <= start) {
    throw badRequest('end must be after start')
  }
  return { start, end }
}

export const parseRegister = (body: any): RegisterBody => {
  const { name, email, password } = body || {}

  if (!text(name) || !text(email) || !text(password)) {
    throw badRequest('name, email and password are required')
  }
  if (!emailRegex.test(email)) {
    throw badRequest('email is not valid')
  }
  if (password.length < 8) {
    throw badRequest('password must have at least 8 characters')
  }
  return { name: name.trim(), email: email.trim().toLowerCase(), password }
}

export const parseLogin = (body: any): LoginBody => {
  const { email, password } = body || {}

  if (!text(email) || !text(password)) {
    throw badRequest('email and password are required')
  }
  return { email: email.trim().toLowerCase(), password }
}

const checkSpaceFields = (body: any) => {
  const { type, capacity, pricePerHour } = body

  if (type !== undefined && !isSpaceType(type)) {
    throw badRequest('type must be desk, private_room or suite')
  }
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) {
    throw badRequest('capacity must be a positive integer')
  }
  if (pricePerHour !== undefined && (typeof pricePerHour !== 'number' || pricePerHour <= 0)) {
    throw badRequest('pricePerHour must be a positive number')
  }
}

export const parseCreateSpace = (body: any): CreateSpaceBody => {
  const { name, type, capacity, pricePerHour, location } = body || {}

  if (!name || !type || !capacity || !pricePerHour || !location) {
    throw badRequest('name, type, capacity, pricePerHour and location are required')
  }
  checkSpaceFields(body)
  return { name, type, capacity, pricePerHour, location }
}

export const parseUpdateSpace = (body: any): UpdateSpaceBody => {
  const { name, type, capacity, pricePerHour, location, isActive } = body || {}

  checkSpaceFields(body || {})
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw badRequest('isActive must be true or false')
  }
  return { name, type, capacity, pricePerHour, location, isActive }
}

export const parseSpaceFilters = (query: any): SpaceFilters => {
  const type = text(query.type)
  const minCapacity = text(query.minCapacity)
  const date = text(query.date)
  const startTime = text(query.startTime)
  const endTime = text(query.endTime)

  const filters: SpaceFilters = {}

  if (type) {
    if (!isSpaceType(type)) {
      throw badRequest('type must be desk, private_room or suite')
    }
    filters.type = type
  }

  if (minCapacity) {
    const min = Number(minCapacity)
    if (!Number.isInteger(min) || min < 1) {
      throw badRequest('minCapacity must be a positive integer')
    }
    filters.minCapacity = min
  }

  if (date) {
    if (!dateRegex.test(date) || isNaN(new Date(`${date}T00:00:00.000Z`).getTime())) {
      throw badRequest('date must have the format YYYY-MM-DD')
    }
    filters.date = date
  }

  if (startTime || endTime) {
    if (!date) {
      throw badRequest('startTime and endTime need a date')
    }
    if (!startTime || !endTime || !timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      throw badRequest('startTime and endTime must have the format HH:mm')
    }
    if (endTime <= startTime) {
      throw badRequest('endTime must be after startTime')
    }
    filters.startTime = startTime
    filters.endTime = endTime
  }

  return filters
}

export const parseCreateBooking = (body: any): CreateBookingBody => {
  const { spaceId, startTime, endTime } = body || {}

  const id = Number(spaceId)
  if (!Number.isInteger(id) || id < 1) {
    throw badRequest('spaceId is required and must be a number')
  }
  const { start, end } = parseDateRange(startTime, endTime)
  return { spaceId: id, startTime: start, endTime: end }
}
