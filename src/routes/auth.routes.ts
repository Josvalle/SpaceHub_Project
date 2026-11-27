import { Router } from 'express'
import * as controller from '../controllers/auth.controller'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()

router.post('/register', asyncHandler(controller.register))
router.post('/login', asyncHandler(controller.login))

export default router
