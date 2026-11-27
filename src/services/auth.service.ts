import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '@prisma/client'
import prisma from '../lib/prisma'
import { AppError } from '../lib/errors'
import { RegisterBody, LoginBody } from '../types'

const createToken = (user: User) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '1d' }
  )
}

const publicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
})

export const register = async ({ name, email, password }: RegisterBody) => {
  const hashedPassword = await bcrypt.hash(password, 10)

  const endDate = new Date()
  endDate.setFullYear(endDate.getFullYear() + 1)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'member',
      membership: { create: { endDate } }
    }
  })

  return { user: publicUser(user), token: createToken(user) }
}

export const login = async ({ email, password }: LoginBody) => {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, 'Invalid credentials')
  }

  return { user: publicUser(user), token: createToken(user) }
}
