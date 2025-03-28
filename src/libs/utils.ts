import { client } from "./openai";
import axios from "axios";

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

interface DefaultWallet {
  decimals: number;
  balance: string;
  symbol: string;
  address: string;
}

interface WalletBalances {
  walletId: string;
  isDefault: boolean;
  network: string;
  balances: DefaultWallet[];
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

export const getWalletDefaultBalance = async (
  token: string
): Promise<DefaultWallet> => {
  const response = await axios.get(
    "https://income-api.copperx.io/api/wallets/balance",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data as DefaultWallet;
};

export const getWalletBalances = async (
  token: string
): Promise<WalletBalances[]> => {
  const response = await axios.get(
    "https://income-api.copperx.io/api/wallets/balances",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data as WalletBalances[];
};

export const setWalletDefault = async (
  token: string,
  walletId: string
): Promise<IGetWallet | null> => {
  const response = await axios.post(
    "https://income-api.copperx.io/api/wallets/default",
    { walletId },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data as IGetWallet;
};

export const formatWallets = (wallets: IGetWallet[] | null) => {
  if (!wallets) return "No wallet available.";

  let formattedMessage = "Your Wallets 💼\n\n";

  wallets
    .sort((a, b) => Number(a.network) - Number(b.network))
    .forEach((el) => {
      const { network, walletAddress: address, isDefault, walletType, id } = el;

      formattedMessage += `🌐 Network: ${
        chains.find((el) => el.id.toString() === network)?.name
      } ${
        isDefault ? "(Default)" : ""
      }\n🔗 Address: ${address}\n🪪 Wallet ID: ${id}\n`;

      formattedMessage += "\n";
    });

  return formattedMessage;
};

export const formatBalances = (balances: WalletBalances[]) => {
  if (!balances) return "No wallet available.";

  let formattedMessage = "💰 Your Balances \n\n";

  balances
    .sort((a, b) => Number(a.network) - Number(b.network))
    .forEach((wallet) => {
      const { network, balances: walletBalances, isDefault } = wallet;

      formattedMessage += `🌐 Network: ${escapeMarkdownV2(
        chains.find((el) => el.id.toString() === network)?.name || network
      )} ${isDefault ? "(Default)" : ""}\n`;

      walletBalances.forEach((balance) => {
        const { symbol, balance: amount, decimals, address } = balance;
        const formattedAmount = (
          parseInt(amount) / Math.pow(10, decimals)
        ).toFixed(2);
        formattedMessage += `🔗 Address: ${address}\n💵 ${escapeMarkdownV2(
          symbol
        )}: ${formattedAmount}\n\n`;
      });

      formattedMessage += "\n";
    });

  return formattedMessage;
};

//////////////////////////////////
//////////////////////////////////

export const generateAIResponse = async (message: string) => {
  try {
    const response = await client.chat.completions.create({
      model: "caramelldansen-1",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly and helpful assistant for the Copperx Bot. Keep your responses concise and relevant.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return (
      response.choices[0].message?.content ||
      "Sorry, I couldn't generate a response."
    );
  } catch (error) {
    console.error("OpenAI error:", error);
    return "Sorry, something went wrong. Please try again later.";
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const chains = [
  { id: 137, name: "Polygon" },
  { id: 42161, name: "Arbitrum" },
  { id: 8453, name: "Base" },
  { id: 23434, name: "Starknet" },
];
