import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

const router = Router()

const createToken = (user: { id: number; email: string; role: string }) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '1d' }
  )
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'password must have at least 8 characters' })
  }

  try {
    const exists = await prisma.user.findUnique({ where: { email } })

    if (exists) {
      return res.status(409).json({ error: 'Email already registered' })
    }

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

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: createToken(user)
    })
  } catch (error) {
    res.status(500).json({ error: 'Could not register the user' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: createToken(user)
    })
  } catch (error) {
    res.status(500).json({ error: 'Could not log in' })
  }
})

export default router
