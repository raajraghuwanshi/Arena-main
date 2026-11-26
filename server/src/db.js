import mongoose from 'mongoose';
import { config } from './config.js';

mongoose.set('strictQuery', true);

let connectionPromise;
let connected = false;

export async function connectDB(uri = config.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connected && mongoose.connection.readyState === 0) {
    connectionPromise = null;
    connected = false;
  }
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8000 })
      .then(() => {
        connected = true;
        console.log('DB connected.');
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        connected = false;
        throw error;
      });
  }
  return connectionPromise;
}
