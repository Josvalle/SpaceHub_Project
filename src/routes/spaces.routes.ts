import { Router } from 'express'
import * as controller from '../controllers/spaces.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validateId } from '../middleware/validateId.middleware'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()

router.get('/', asyncHandler(controller.list))
router.get('/:id', validateId(), asyncHandler(controller.get))
router.post('/', authenticate, authorize('admin'), asyncHandler(controller.create))
router.patch('/:id', authenticate, authorize('admin'), validateId(), asyncHandler(controller.update))
router.delete('/:id', authenticate, authorize('admin'), validateId(), asyncHandler(controller.deactivate))

export default router
