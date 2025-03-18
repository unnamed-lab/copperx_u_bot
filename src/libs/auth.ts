import axios from "axios";
import { redisClient } from "./redis";

export const requestOTP = async (email: string): Promise<any> => {
  const response = await axios.post(
    "https://income-api.copperx.io/api/auth/email-otp/request",
    { email }
  );
  return response.data;
};

export const authenticateOTP = async (
  email: string,
  otp: string,
  sid: string
): Promise<any> => {
  const response = await axios.post(
    "https://income-api.copperx.io/api/auth/email-otp/authenticate",
    { email, otp, sid }
  );
  return response.data as any;
};

export const getUserToken = async (userId: string): Promise<string | null> => {
  const data = await redisClient.get(`user:${userId}`);
  return data ? JSON.parse(data)?.accessToken : null;
};
