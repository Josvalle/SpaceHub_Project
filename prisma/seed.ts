import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const main = async () => {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Admin'

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to run the seed')
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must have at least 8 characters')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const endDate = new Date()
  endDate.setFullYear(endDate.getFullYear() + 1)

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, password: hashedPassword, role: 'admin' },
    create: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      membership: { create: { endDate } }
    }
  })

  console.log(`Admin ready: ${email}`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
