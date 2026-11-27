import { Router } from 'express'
import * as controller from '../controllers/reservations.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validateId } from '../middleware/validateId.middleware'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()

router.post('/', authenticate, asyncHandler(controller.create))
router.get('/', authenticate, asyncHandler(controller.list))
router.get('/:id', authenticate, validateId(), asyncHandler(controller.get))
router.patch('/:id/cancel', authenticate, validateId(), asyncHandler(controller.cancel))

export default router
