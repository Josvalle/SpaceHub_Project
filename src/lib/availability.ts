import { Prisma } from '@prisma/client'

export const overlaps = (start: Date, end: Date): Prisma.BookingWhereInput => ({
  status: { not: 'canceled' },
  startTime: { lt: end },
  endTime: { gt: start }
})

export const isFullyBooked = (bookings: { startTime: Date; endTime: Date }[], start: Date, end: Date) => {
  const sorted = [...bookings].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  let covered = start.getTime()

  for (const booking of sorted) {
    if (booking.startTime.getTime() > covered) {
      return false
    }
    covered = Math.max(covered, booking.endTime.getTime())
    if (covered >= end.getTime()) {
      return true
    }
  }
  return false
}
