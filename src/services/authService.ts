import { requestOTP, authenticateOTP } from "../libs/auth";
import { getOTPData } from "../libs/redis";
import { setSession } from "../libs/storage";

export const AuthService = {
  async login(email: string) {
    const token = await requestOTP(email);
    return token;
  },

  async verifyOTP(userId: string, otp: string) {
    const meta = await getOTPData(userId);
    if (meta) {
      const { email, sid } = meta;
      const token = await authenticateOTP(email, otp, sid);
      await setSession(userId, { ...token });
      return token;
      }
      
    return null;
  },
};
