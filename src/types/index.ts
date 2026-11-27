import { Role, SpaceType, Plan } from '@prisma/client'

export interface AuthUser {
  userId: number
  email: string
  role: Role
}

export interface RegisterBody {
  name: string
  email: string
  password: string
}

export interface LoginBody {
  email: string
  password: string
}

export interface CreateSpaceBody {
  name: string
  type: SpaceType
  capacity: number
  pricePerHour: number
  location: string
}

export interface UpdateSpaceBody {
  name?: string
  type?: SpaceType
  capacity?: number
  pricePerHour?: number
  location?: string
  isActive?: boolean
}

export interface SpaceFilters {
  type?: SpaceType
  minCapacity?: number
  date?: string
  startTime?: string
  endTime?: string
}

export interface CreateBookingBody {
  spaceId: number
  startTime: Date
  endTime: Date
}

export interface UpdateMembershipBody {
  plan: Plan
}

export interface DateRange {
  start: Date
  end: Date
}

export interface GraphQLContext {
  user: AuthUser | null
}
