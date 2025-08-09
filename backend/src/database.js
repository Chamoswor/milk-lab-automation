import { dbClient } from './config/dbConfig.js';
import { initializeSessionStore } from './middlewares/sessionMiddleware.js';
import express, { json, urlencoded } from 'express';
import { User, Rack, RackSlot, SampleType, Sample} from './models/index.js';

const app = express();

async function ensureAdminUser() {
  try {
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) {

      await User.create({
        username: 'admin',
        password_hash: process.env.ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log('Admin user created!');
    }
  } catch (err) {
    console.error('Error ensuring admin user:', err);
  }
}

async function syncModels() {
  try {
    await User.sync();
    await SampleType.sync();
    await Sample.sync();
    await Rack.sync();
    await RackSlot.sync();
    
    console.log('Models synced successfully');
  } catch (error) {
    console.error('Error syncing models:', error);
  }
}

async function connectWithRetry() {
  try {
    await dbClient.authenticate();
    await syncModels();
    await ensureAdminUser();
    await initializeSessionStore();
    console.log('Database connection established successfully');
  } catch (err) {
    console.error('Database connection error, retrying in 5 seconds:', err);
    setTimeout(connectWithRetry, 5000);
  }
}

async function syncDb() {
  try {
    await dbClient.sync();
    console.log('Database synkronisert!');
  } catch (err) {
    console.error('Feil under synkronisering av database:', err);
  }
}





export {
    connectWithRetry,
    syncDb,
    ensureAdminUser,
    syncModels,
}