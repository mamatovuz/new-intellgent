import mongoose from "mongoose";
import { config } from "./config.js";

let mongoConnectionPromise = null;

export async function connectMongo() {
  if (!config.mongoUri) {
    throw new Error("MONGODB_URI kiritilmagan. MongoDB Atlas ulanishini env ga yozing.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose.connect(config.mongoUri, {
      dbName: config.mongoDbName
    });
  }

  await mongoConnectionPromise;
  return mongoose.connection;
}

export async function testMongoConnection() {
  const connection = await connectMongo();
  await connection.db.admin().ping();
  return {
    host: connection.host,
    name: connection.name
  };
}
