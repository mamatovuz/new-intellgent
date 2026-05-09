import mongoose from "mongoose";
import { config } from "./config.js";

let mongoConnectionPromise = null;

function explainMongoError(error) {
  const message = error?.message || String(error || "MongoDB ulanish xatosi");
  const lower = message.toLowerCase();

  if (
    lower.includes("whitelist") ||
    lower.includes("ip that isn't whitelisted") ||
    lower.includes("could not connect to any servers")
  ) {
    return `${message}\nMongoDB Atlas > Network Access ichida Railway server IP'iga ruxsat bering yoki vaqtincha 0.0.0.0/0 qo'shing.`;
  }

  if (lower.includes("authentication failed")) {
    return `${message}\nMONGODB_URI ichidagi username yoki parol noto'g'ri ko'rinadi.`;
  }

  return message;
}

export async function connectMongo() {
  if (!config.mongoUri) {
    throw new Error("MONGODB_URI kiritilmagan. MongoDB Atlas ulanishini env ga yozing.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose
      .connect(config.mongoUri, {
        dbName: config.mongoDbName,
        serverSelectionTimeoutMS: 15000
      })
      .catch((error) => {
        mongoConnectionPromise = null;
        throw new Error(explainMongoError(error));
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
