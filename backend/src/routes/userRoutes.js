import { Router } from 'express';
import { getUserData, getRole } from '../controllers/userController.js';

const userRouter = Router();

userRouter.get('/', (req, res) => {
    res.json({ message: 'Backend API kjører' });
});

userRouter.get('/data', getUserData);
userRouter.get('/role', getRole);

export default userRouter;