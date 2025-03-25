import { requestOTP, authenticateOTP } from "../libs/auth";
import { getOTPData } from "../libs/redis";
import { setSession } from "../libs/storage";
import { AuthUserDto } from "../types/user";
import axios from "axios";

export const AuthService = {
  async login(email: string) {
    const token = await requestOTP(email);
    return token;
  },

  async logout(accessToken: string) {
    const response = await axios.post(
      "https://income-api.copperx.io/api/auth/logout",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
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

  async getProfile(accessToken: string): Promise<AuthUserDto> {
    const response = await axios.get<AuthUserDto>(
      "https://income-api.copperx.io/api/auth/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },
};
