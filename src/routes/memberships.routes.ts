import { Router } from 'express'
import * as controller from '../controllers/memberships.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validateId } from '../middleware/validateId.middleware'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()

router.get('/', authenticate, authorize('admin'), asyncHandler(controller.list))
router.patch('/:userId', authenticate, authorize('admin'), validateId('userId'), asyncHandler(controller.updatePlan))

export default router
