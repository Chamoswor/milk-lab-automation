import { Router } from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import { getProfile } from '../controllers/profileController.js';

const profileRoutes = Router();
profileRoutes.use(isAuthenticated);

profileRoutes.get('/get', getProfile);

export default profileRoutes;