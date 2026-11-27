import { createPubSub } from 'graphql-yoga'

const pubsub = createPubSub<{ availability: [] }>()

export const notifyAvailabilityChange = () => {
  pubsub.publish('availability')
}

export const onAvailabilityChange = () => pubsub.subscribe('availability')
