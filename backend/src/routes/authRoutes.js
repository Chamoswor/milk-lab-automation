import { Router } from 'express';
import { login, logout } from '../controllers/authController.js';

const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.get('/logout', logout);

export default authRoutes;