import express, { json, urlencoded } from 'express';
import corsMiddleware from './middlewares/corsMiddleware.js';
import { sessionMiddleware } from './middlewares/sessionMiddleware.js';
import errorHandler from './middlewares/errorHandler.js';
import { adminRoutes, authRoutes, profileRoutes, userRoutes, labRoutes } from './routes/index.js';


const app = express();
const listen = app.listen.bind(app);

// Sikkerhetsmiddelware
app.use(corsMiddleware);

// Trust proxy
app.set('trust proxy', 1);

// Body parsing middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Session-middleware
app.use(sessionMiddleware);

// Ruter
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/lab', labRoutes);


// Feilhåndtering
app.use(errorHandler);
export {
    app,
    listen,
};