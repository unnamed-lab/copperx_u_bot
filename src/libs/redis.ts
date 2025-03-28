import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: "redis-10227.c338.eu-west-2-1.ec2.redns.redis-cloud.com",
    port: 10227,
  },
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis.");
});

const connectRedis = async () => {
  await redisClient.connect();
};

/////////////////////////////////////////

const setOTPData = async (
  userId: string,
  data: any,
  ttl: number = 1 * 60 * 60
) => {
  await redisClient.set(`user:otp:${userId}`, JSON.stringify(data), {
    EX: ttl, // Set expiration to 1 hour (in seconds)
  });
};

const getOTPData = async (
  userId: string
): Promise<{ email: string; sid: string } | null> => {
  const data = await redisClient.get(`user:otp:${userId}`);
  return data ? JSON.parse(data) : null;
};
/////////////////////////////////////////

const setUserData = async (
  userId: string,
  data: any,
  ttl: number = 7 * 24 * 60 * 60
) => {
  await redisClient.set(`user:${userId}`, JSON.stringify(data), {
    EX: ttl, // Set expiration to 7 days (in seconds)
  });
};

export interface UserRedis {
  scheme: string;
  accessToken: string;
  accessTokenId: string;
  expireAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    status: string;
    role: string;
    relayerAddress: string;
    organizationId: string;
    walletAddress: string;
    walletAccountType: string;
    walletId: string;
    flags: string[];
  };
}

const getUserData = async (userId: string): Promise<UserRedis | null> => {
  const data = await redisClient.get(`user:${userId}`);
  return data ? JSON.parse(data) : null;
};

const deleteUserData = async (userId: string) => {
  const status = await redisClient.del(`user:${userId}`).catch((err) => {
    console.error("Error deleting user data:", err);
  });
};

const getAuthAttempts = async (
  userId: string
): Promise<{
  count: number;
  lastAttempt: number;
  cooldownUntil?: number;
} | null> => {
  const data = await redisClient.get(`auth_attempts:${userId}`);
  return data ? JSON.parse(data) : null;
};

const setAuthAttempts = async (
  userId: string,
  attempts: {
    count: number;
    lastAttempt: number;
    cooldownUntil?: number;
  }
) => {
  await redisClient.set(`auth_attempts:${userId}`, JSON.stringify(attempts), {
    EX: 60 * 60, // Expire after 1 hour
  });
};

const resetAuthAttempts = async (userId: string) => {
  await redisClient.del(`auth_attempts:${userId}`);
};

////////////////////////////////////////

export {
  redisClient,
  connectRedis,
  setOTPData,
  getOTPData,
  setUserData,
  getUserData,
  deleteUserData,
  getAuthAttempts,
  setAuthAttempts,
  resetAuthAttempts,
};
