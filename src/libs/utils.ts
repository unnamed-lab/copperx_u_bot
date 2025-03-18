import axios from "axios";

export const getWalletBalances = async (token: string): Promise<any> => {
  const response = await axios.get(
    "https://income-api.copperx.io/api/wallets/balances",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export const sendFundsByEmail = async (
  token: string,
  email: string,
  amount: number
): Promise<any> => {
  const response = await axios.post(
    "https://income-api.copperx.io/api/transfers/send",
    {
      email,
      amount,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export const withdrawFunds = async (
  token: string,
  bankDetails: any,
  amount: number
): Promise<any> => {
  const response = await axios.post(
    "https://income-api.copperx.io/api/transfers/offramp",
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

export const formatBalances = (balances: any[]) => {
  let formattedMessage = "*Your Balances* 💰\n\n";

  balances.forEach((wallet) => {
    const { network, balances: walletBalances } = wallet;

    formattedMessage += `🌐 *Network*: ${escapeMarkdownV2(network)}\n`;

    walletBalances.forEach((balance: any) => {
      const { symbol, balance: amount, decimals, address } = balance;
      const formattedAmount = (
        parseInt(amount) / Math.pow(10, decimals)
      ).toFixed(2);
      formattedMessage += `🔗 *Address*: ${address}\n💵 ${escapeMarkdownV2(
        symbol
      )}: ${escapeMarkdownV2(formattedAmount)}\n`;
    });

    formattedMessage += "\n"; // Add a newline between wallets
  });

  return formattedMessage;
};

export const escapeMarkdownV2 = (text: string) => {
  const reservedChars = [
    "-",
    ".",
    "!",
    "(",
    ")",
    ">",
    "#",
    "+",
    "=",
    "|",
    "{",
    "}",
    "[",
    "]",
    "_",
    "`",
  ];
  let escapedText = text;

  reservedChars.forEach((char) => {
    escapedText = escapedText.replace(
      new RegExp(`\\${char}`, "g"),
      `\\${char}`
    );
  });

  return escapedText;
};
