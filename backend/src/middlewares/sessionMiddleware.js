import session from 'express-session';
import { SequelizeStoreConfig } from '../config/dbConfig.js';
import connectSessionSequelize from 'connect-session-sequelize';

const SequelizeStore = connectSessionSequelize(session.Store);
const sessionStore = new SequelizeStore(SequelizeStoreConfig);

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
});

export async function initializeSessionStore() {
    try {
        await sessionStore.sync();
        console.log("Session store initialized successfully");
    } catch (error) {
        console.error("Error initializing session store:", error);
    }
}

export {
    sessionStore,
    sessionMiddleware
};