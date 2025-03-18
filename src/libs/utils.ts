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

    formattedMessage += "\n";
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

interface IGetWallet {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  walletType: string;
  network: string;
  walletAddress: string;
  isDefault: boolean;
}

export const getWallet = async (
  token: string
): Promise<IGetWallet[] | null> => {
  const response = await axios.get(
    "https://income-api.copperx.io/api/wallets",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data as IGetWallet[];
};

export const getWalletDefault = async (
  token: string
): Promise<IGetWallet | null> => {
  const response = await axios.get(
    "https://income-api.copperx.io/api/wallets/default",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data as IGetWallet;
};

export const formatWallets = (wallets: IGetWallet[] | null) => {
  if (!wallets) return "No wallet available.";

  let formattedMessage = "*Your Wallets* 💼\n\n";

  wallets.forEach((el) => {
    const { network, walletAddress: address, isDefault, walletType, id } = el;

    formattedMessage += `🌐 *Network*: ${network.toUpperCase()}\n🔗 *Address*: ${address}\n🤖 *Wallet Type*: ${walletType
      .replace("_", " ")
      .toUpperCase()}\n🔥*Default*: ${
      isDefault ? "TRUE" : "FALSE"
    }\n🪪 Wallet ID: ${id}\n`;

    formattedMessage += "\n";
  });

  return formattedMessage;
};
