import axios from "axios";
import { Markup } from "telegraf";
import { escapeMarkdownV2 } from "./utils";

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

enum CURRENCIES {
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
}

enum PURPOSECODE {
  "self",
  "salary",
  "gift",
  "income",
  "saving",
  "education_support",
  "family",
  "home_improvement",
  "reimbursement",
}

enum BankAccountType {
  SAVINGS = "Savings",
  CHECKING = "Checking",
}

// Define the types for the enums
export type PurposeCode =
  | "self"
  | "salary"
  | "gift"
  | "income"
  | "saving"
  | "education_support"
  | "family"
  | "home_improvement"
  | "reimbursement";
export type SourceOfFunds =
  | "salary"
  | "savings"
  | "lottery"
  | "investment"
  | "loan"
  | "business_income"
  | "others";
export type RecipientRelationship =
  | "self"
  | "spouse"
  | "son"
  | "daughter"
  | "father"
  | "mother"
  | "other";
export type Country =
  | "usa"
  | "ind"
  | "are"
  | "idn"
  | "pak"
  | "sgp"
  | "esp"
  | "can"
  | "cym"
  | "lbn"
  | "mys"
  | "pan"
  | "tur"
  | "vct"
  | "vgb"
  | "vnm"
  | "bel"
  | "tha"
  | "hkg"
  | "aut"
  | "hrv"
  | "cyp"
  | "est"
  | "fin"
  | "fra"
  | "gre"
  | "irl"
  | "ita"
  | "lva"
  | "ltu"
  | "lux"
  | "mlt"
  | "nld"
  | "prt"
  | "svk"
  | "svn"
  | "deu"
  | "bgd"
  | "phl"
  | "khm"
  | "aus"
  | "gbr"
  | "npl"
  | "lka"
  | "ben"
  | "cmr"
  | "gha"
  | "ken"
  | "moz"
  | "sen"
  | "tza"
  | "uga"
  | "nzl"
  | "kor"
  | "mmr"
  | "jpn"
  | "bra"
  | "chn"
  | "none";
export type Currency =
  | "USD"
  | "INR"
  | "AED"
  | "IDR"
  | "PKR"
  | "SGD"
  | "EUR"
  | "MYR"
  | "CAD"
  | "KYD"
  | "LBP"
  | "TRY"
  | "XCD"
  | "VND"
  | "THB"
  | "HKD"
  | "BDT"
  | "PHP"
  | "KHR"
  | "AUD"
  | "GBP"
  | "NPR"
  | "LKR"
  | "XOF"
  | "XAF"
  | "GHS"
  | "KES"
  | "MZN"
  | "TZS"
  | "UGX"
  | "NZD"
  | "KRW"
  | "MMK"
  | "JPY"
  | "BRL"
  | "CNY"
  | "USDC"
  | "USDT"
  | "DAI"
  | "ETH"
  | "USDCE"
  | "STRK";
export type TransferStatus =
  | "pending"
  | "initiated"
  | "processing"
  | "success"
  | "canceled"
  | "failed"
  | "refunded";
export type TransferType =
  | "send"
  | "receive"
  | "withdraw"
  | "deposit"
  | "bridge"
  | "bank_deposit";
export type TransferMode = "on_ramp" | "off_ramp" | "remittance" | "on_chain";
export type TransferAccountType =
  | "web3_wallet"
  | "bank_ach"
  | "bank_ach_push"
  | "bank_wire"
  | "bank_transfer"
  | "bank_ifsc"
  | "bank_iban";

// Define the CustomerDataDto interface
export interface CustomerDataDto {
  name: string;
  businessName: string;
  email: string;
  country: Country;
}

// Define the CreateOfframpTransferDto interface
export interface CreateOfframpTransferDto {
  invoiceNumber: string;
  invoiceUrl: string;
  purposeCode: PurposeCode;
  sourceOfFunds: SourceOfFunds;
  recipientRelationship: RecipientRelationship;
  quotePayload: string;
  quoteSignature: string;
  preferredWalletId: string;
  customerData: CustomerDataDto;
  sourceOfFundsFile: string;
  note: string;
}

// Define the TransferAccountDto interface
export interface TransferAccountDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: TransferAccountType;
  country: Country;
  network: string;
  accountId: string;
  walletAddress: string;
  bankName: string;
  bankAddress: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  bankDepositMessage: string;
  wireMessage: string;
  payeeEmail: string | null;
  payeeOrganizationId: string | null;
  payeeId: string | null;
  payeeDisplayName: string | null;
}

// Define the TransferWithAccountDto interface
export interface TransferWithAccountDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: TransferStatus;
  customerId: string;
  customer: {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    businessName: string;
    email: string;
    country: Country;
  };
  type: TransferType;
  sourceCountry: Country;
  destinationCountry: Country;
  destinationCurrency: Currency;
  amount: string;
  currency: Currency;
  amountSubtotal: string;
  totalFee: string;
  feePercentage: string;
  feeCurrency: Currency;
  invoiceNumber: string;
  invoiceUrl: string;
  sourceOfFundsFile: string;
  note: string;
  purposeCode: PurposeCode;
  sourceOfFunds: SourceOfFunds;
  recipientRelationship: RecipientRelationship;
  sourceAccountId: string;
  destinationAccountId: string;
  paymentUrl: string;
  mode: TransferMode;
  isThirdPartyPayment: boolean;
  sourceAccount: TransferAccountDto;
  destinationAccount: TransferAccountDto;
  senderDisplayName: string;
}

// Define the CreateWalletWithdrawTransferDto interface
export interface CreateWalletWithdrawTransferDto {
  walletAddress: string;
  amount: string;
  purposeCode: PurposeCode;
  currency?: Currency;
}

// Define the CreateSendTransferDto interface
export interface CreateSendTransferDto {
  walletAddress?: string;
  email?: string;
  payeeId?: string;
  amount: string;
  purposeCode: PurposeCode;
  currency?: Currency;
}

export interface PayeePaginatedResponse {
  page: number; // Page number, starts from 1
  limit: number; // Number of items per page
  count: number; // Total count of items
  hasMore: boolean; // Indicates if there are more items to fetch
  data: PayeeDto[]; // Array of PayeeDto objects
}

export interface PayeeBankAccountDto {
  country: Country; // Country of the bank account
  bankName: string; // Bank name or branch name
  bankAddress: string; // Bank location or branch address
  type: TransferAccountType; // Bank transfer method used for this account
  bankAccountType: BankAccountType; // Savings or checking account
  bankRoutingNumber: string; // IFSC, routing number, or SWIFT code
  bankAccountNumber: string; // IBAN or account number
  bankBeneficiaryName: string; // Name of the account holder
  bankBeneficiaryAddress: string; // Address of the account holder
  swiftCode: string; // SWIFT/BIC code for international transfers
}

export interface CreatePayeeDto {
  nickName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  bankAccount: {
    country: string;
    bankName: string;
    bankAddress: string;
    type: string;
    bankAccountType: string;
    bankRoutingNumber?: string;
    bankAccountNumber: string;
    bankBeneficiaryName: string;
    bankBeneficiaryAddress: string;
    swiftCode?: string;
  };
}

export interface PayeeDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  nickName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  displayName: string;
  bankAccount: {
    country: string;
    bankName: string;
    bankAddress: string;
    type: string;
    bankAccountType: string;
    bankRoutingNumber?: string;
    bankAccountNumber: string;
    bankBeneficiaryName: string;
    bankBeneficiaryAddress: string;
    swiftCode?: string;
  };
  isGuest: boolean;
  hasBankAccount: boolean;
}

export interface UpdatePayeeDto {
  nickName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface SuccessDto {
  message: string;
  statusCode: number;
}

export interface Transfer {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  type: string;
  amount: string;
  currency: string;
  sourceAccount: {
    walletAddress: string;
  };
  destinationAccount: {
    walletAddress: string;
  };
}

export interface TransfersResponse {
  page: number;
  limit: number;
  count: number;
  hasMore: boolean;
  data: Transfer[];
}

// Define the sendFundsPayload interface
export interface sendFundsPayload {
  walletAddress: string | undefined;
  email: string | undefined;
  payeeId: string;
  amount: string;
  purposeCode: PURPOSECODE;
  currency: CURRENCIES;
}

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

export interface depositFundsPayload {
  amount: string;
  sourceOfFunds: string;
  depositChainId: number;
}

interface Customer {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  businessName: string;
  email: string;
  country: string;
}

interface DepositAccount {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  country: string;
  network: string;
  accountId: string;
  walletAddress: string;
  bankName: string;
  bankAddress: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  bankDepositMessage: string;
  wireMessage: string;
  payeeEmail: string;
  payeeOrganizationId: string;
  payeeId: string;
  payeeDisplayName: string;
}

interface Transaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  type: string;
  providerCode: string;
  kycId: string;
  transferId: string;
  status: string;
  externalStatus: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  totalFee: string;
  feeCurrency: string;
  transactionHash: string;
  depositAccount: DepositAccount;
  externalTransactionId: string;
  externalCustomerId: string;
  depositUrl: string;
}

interface Account {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  country: string;
  network: string;
  accountId: string;
  walletAddress: string;
  bankName: string;
  bankAddress: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  bankDepositMessage: string;
  wireMessage: string;
  payeeEmail: string;
  payeeOrganizationId: string;
  payeeId: string;
  payeeDisplayName: string;
}

interface DepositResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: string;
  customerId: string;
  customer: Customer;
  type: string;
  sourceCountry: string;
  destinationCountry: string;
  destinationCurrency: string;
  amount: string;
  currency: string;
  amountSubtotal: string;
  totalFee: string;
  feePercentage: string;
  feeCurrency: string;
  invoiceNumber: string;
  invoiceUrl: string;
  sourceOfFundsFile: string;
  note: string;
  purposeCode: string;
  sourceOfFunds: string;
  recipientRelationship: string;
  sourceAccountId: string;
  destinationAccountId: string;
  paymentUrl: string;
  mode: string;
  isThirdPartyPayment: boolean;
  transactions: Transaction[];
  destinationAccount: Account;
  sourceAccount: Account;
  senderDisplayName: string;
}

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
