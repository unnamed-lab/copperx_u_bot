import axios from "axios";
import { Markup } from "telegraf";
import { escapeMarkdownV2 } from "./utils";
import {
  Country,
  CreateOfframpTransferDto,
  CreatePayeeDto,
  CreateSendTransferDto,
  CreateWalletWithdrawTransferDto,
  Currency,
  depositFundsPayload,
  DepositResponse,
  PayeeDto,
  PayeePaginatedResponse,
  PurposeCode,
  RecipientRelationship,
  sendFundsPayload,
  SourceOfFunds,
  SuccessDto,
  TransfersResponse,
  TransferWithAccountDto,
  UpdatePayeeDto,
} from "../types/transactions";

export const validCurrencies = [
  "USD",
  "INR",
  "AED",
  "IDR",
  "PKR",
  "SGD",
  "EUR",
  "MYR",
  "CAD",
  "KYD",
  "LBP",
  "TRY",
  "XCD",
  "VND",
  "THB",
  "HKD",
  "BDT",
  "PHP",
  "KHR",
  "AUD",
  "GBP",
  "NPR",
  "LKR",
  "XOF",
  "XAF",
  "GHS",
  "KES",
  "MZN",
  "TZS",
  "UGX",
  "NZD",
  "KRW",
  "MMK",
  "JPY",
  "BRL",
  "CNY",
  "USDC",
  "USDT",
  "DAI",
  "ETH",
  "USDCE",
  "STRK",
];

export const validPurposeCodes: PurposeCode[] = [
  "self",
  "salary",
  "gift",
  "income",
  "saving",
  "education_support",
  "family",
  "home_improvement",
  "reimbursement",
];

export const validSourceOfFunds: SourceOfFunds[] = [
  "salary",
  "savings",
  "lottery",
  "investment",
  "loan",
  "business_income",
  "others",
];

export const validRecipientRelationships: RecipientRelationship[] = [
  "self",
  "spouse",
  "son",
  "daughter",
  "father",
  "mother",
  "other",
];

export const validCountries: Country[] = [
  "usa",
  "ind",
  "are",
  "idn",
  "pak",
  "sgp",
  "esp",
  "can",
  "cym",
  "lbn",
  "mys",
  "pan",
  "tur",
  "vct",
  "vgb",
  "vnm",
  "bel",
  "tha",
  "hkg",
  "aut",
  "hrv",
  "cyp",
  "est",
  "fin",
  "fra",
  "gre",
  "irl",
  "ita",
  "lva",
  "ltu",
  "lux",
  "mlt",
  "nld",
  "prt",
  "svk",
  "svn",
  "deu",
  "bgd",
  "phl",
  "khm",
  "aus",
  "gbr",
  "npl",
  "lka",
  "ben",
  "cmr",
  "gha",
  "ken",
  "moz",
  "sen",
  "tza",
  "uga",
  "nzl",
  "kor",
  "mmr",
  "jpn",
  "bra",
  "chn",
  "none",
];

// Define the list of currencies
export const currencies: Currency[] = [
  "USD",
  "INR",
  "AED",
  "IDR",
  "PKR",
  "SGD",
  "EUR",
  "MYR",
  "CAD",
  "KYD",
  "LBP",
  "TRY",
  "XCD",
  "VND",
  "THB",
  "HKD",
  "BDT",
  "PHP",
  "KHR",
  "AUD",
  "GBP",
  "NPR",
  "LKR",
  "XOF",
  "XAF",
  "GHS",
  "KES",
  "MZN",
  "TZS",
  "UGX",
  "NZD",
  "KRW",
  "MMK",
  "JPY",
  "BRL",
  "CNY",
  "USDC",
  "USDT",
  "DAI",
  "ETH",
  "USDCE",
  "STRK",
];

// Define the list of purpose codes
export const purposeCodes: PurposeCode[] = [
  "self",
  "salary",
  "gift",
  "income",
  "saving",
  "education_support",
  "family",
  "home_improvement",
  "reimbursement",
];

export const sendFunds = async (
  token: string,
  payload: sendFundsPayload
): Promise<any> => {
  const response = await axios.post(
    "https://income-api.copperx.io/api/transfers/send",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};


export const depositFunds = async (
  token: string,
  payload: depositFundsPayload
) => {
  const response = await axios.post(
    "https://income-api.copperx.io/api/transfers/deposit",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data as DepositResponse;
};

export const withdrawFunds = async (
  token: string,
  payload: CreateOfframpTransferDto
) => {
  const response = await axios.post<TransferWithAccountDto>(
    "https://income-api.copperx.io/api/transfers/offramp",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const withdrawFundsWallet = async (
  token: string,
  payload: CreateWalletWithdrawTransferDto
) => {
  const response = await axios.post<TransferWithAccountDto>(
    "https://income-api.copperx.io/api/transfers/wallet-withdraw",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const withdrawFundsEmail = async (
  token: string,
  payload: CreateSendTransferDto
) => {
  const response = await axios.post<TransferWithAccountDto>(
    "https://income-api.copperx.io/api/transfers/send",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

export const formatAmount = (amount: string, isString: boolean = true) => {
  const formatAmount = (Number(amount) || 0) * 100_000_000;
  return isString ? formatAmount.toString() : formatAmount;
};

export const fetchPayeeId = async (token: string, text: string) => {
  const searchQuery = text.split("@")[0];
  const response = await axios.get<PayeePaginatedResponse>(
    `https://income-api.copperx.io/api/payees?limit=20&searchText=${searchQuery}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const payee = response.data.data.find((el) => el.email === text);

  if (!payee) return "";

  return payee.id;
};

export const fetchPayee = async (token: string, text: string) => {
  const searchQuery = text.split("@")[0];
  const response = await axios.get<PayeePaginatedResponse>(
    `https://income-api.copperx.io/api/payees?limit=5&searchText=${searchQuery}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const payee = response.data.data.find((el) => el.email === text);

  if (!payee) return null;

  return payee;
};

export async function getAllPayee(token: string) {
  const response = await axios.get<PayeePaginatedResponse>(
    "https://income-api.copperx.io/api/payees?limit=50",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.data;
}

export async function createPayee(
  token: string,
  payload: CreatePayeeDto
): Promise<PayeeDto> {
  const response = await axios.post<PayeeDto>(
    "https://income-api.copperx.io/api/payees",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

export async function getPayee(token: string, id: string): Promise<PayeeDto> {
  const response = await axios.get<PayeeDto>(
    `https://income-api.copperx.io/api/payees/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

export async function updatePayee(
  token: string,
  id: string,
  payload: UpdatePayeeDto
): Promise<PayeeDto> {
  const response = await axios.put<PayeeDto>(
    `https://income-api.copperx.io/api/payees/${id}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

export async function deletePayee(
  token: string,
  id: string
): Promise<SuccessDto> {
  const response = await axios.delete<SuccessDto>(
    `https://income-api.copperx.io/api/payees/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

// Helper function to validate the page number
export function validatePage(page: number, totalPages: number): number {
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}

// Helper function to create pagination buttons
export function createPaginationKeyboard(
  response: TransfersResponse,
  currentPage: number
): any[] {
  const keyboard = [];

  if (currentPage > 1) {
    keyboard.push(Markup.button.callback("⬅️ Previous Page", "prev_page"));
  }

  keyboard.push(Markup.button.callback("🔄 Refresh", "refresh_page"));

  if (response.hasMore) {
    keyboard.push(Markup.button.callback("Next Page ➡️", "next_page"));
  }

  return [keyboard]; // Wrap in an array to create a single row
}

// Helper function to format the transfers data into a message
export function formatTransfersMessage(
  response: TransfersResponse,
  currentPage: number
): string {
  let message = escapeMarkdownV2(`📋 *Transfers (Page ${currentPage})*\n\n`);

  if (response.data.length === 0) {
    return "No transfers found.";
  }

  response.data.forEach((transfer, index) => {
    message += escapeMarkdownV2(
      `**Transfer ${index + 1}:**\n` +
        `- 🆔 ID: ${transfer.id}\n` +
        `- 📅 Created: ${new Date(transfer.createdAt).toLocaleString()}\n` +
        `- 🟢 Status: ${transfer.status}\n` +
        `- 💸 Type: ${transfer.type}\n` +
        `- 💰 Amount: ${Number(transfer.amount) / 100_000_000} ${
          transfer.currency
        }\n` +
        `- 📤 Source: ${transfer.sourceAccount.walletAddress}\n` +
        `- 📥 Destination: ${transfer.destinationAccount.walletAddress}\n\n`
    );
  });

  return message;
}

// Update the fetchTransfers function to handle invalid pages
export async function fetchTransfers(
  token: string,
  page: number,
  limit: number
): Promise<TransfersResponse> {
  const response = await axios.get<TransfersResponse>(
    "https://income-api.copperx.io/api/transfers",
    {
      params: { page, limit },
      headers: {
        Authorization: `Bearer ${token}`, // Replace with your auth token
      },
    }
  );

  // Ensure the page number is valid
  const totalPages = Math.ceil(response.data.count / limit);
  response.data.page = validatePage(page, totalPages);

  return response.data;
}

// Function to split currencies into chunks of 3
export const chunkCurrencies = (
  currencies: Currency[],
  size: number
): Currency[][] => {
  const chunks = [];
  for (let i = 0; i < currencies.length; i += size) {
    chunks.push(currencies.slice(i, i + size));
  }
  return chunks;
};

// Function to split purpose codes into chunks of 2
export const chunkPurposeCodes = (
  purposeCodes: PurposeCode[],
  size: number
): PurposeCode[][] => {
  const chunks = [];
  for (let i = 0; i < purposeCodes.length; i += size) {
    chunks.push(purposeCodes.slice(i, i + size));
  }
  return chunks;
};
