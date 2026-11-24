import { createPubSub } from 'graphql-yoga'

const pubsub = createPubSub<{ bookings: [number] }>()

export const notifyBookingChange = (spaceId: number) => {
  pubsub.publish('bookings', spaceId)
}

export const onBookingChange = () => pubsub.subscribe('bookings')
