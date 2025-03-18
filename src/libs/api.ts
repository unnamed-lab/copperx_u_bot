import axios from "axios";

const COPPERX_API_URL = "https://income-api.copperx.io";

const authenticateOTP = async (email: string, otp: string) => {
  const response = await axios.post(
    `${COPPERX_API_URL}/api/auth/email-otp/authenticate`,
    { email, otp }
  );
  return (response.data as any).token as any;
};

const getWalletBalances = async (token: string) => {
  const response = await axios.get(`${COPPERX_API_URL}/api/wallets/balances`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const withdrawFunds = async (
  token: string,
  bankDetails: string,
  amount: number
) => {
  const response = await axios.post(
    `${COPPERX_API_URL}/api/transfers/offramp`,
    {
      bankDetails,
      amount,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export { authenticateOTP, getWalletBalances, withdrawFunds };
