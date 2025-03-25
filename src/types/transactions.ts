import { Account, Customer } from "./user";

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

export interface OfframpQuoteRequestDto {
    amount: string;
    sourceCountry: Country;
    destinationCountry: Country;
    onlyRemittance: boolean;
    preferredBankAccountId?: string;
    currency: Currency;
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

export interface DepositResponse {
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

export interface Transaction {
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

export interface DepositAccount {
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

export interface depositFundsPayload {
  amount: string;
  sourceOfFunds: string;
  depositChainId: number;
}
