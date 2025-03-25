export interface Account {
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

export interface Customer {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  businessName: string;
  email: string;
  country: string;
}

export interface AuthUserDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImage?: string;
  organizationId: string;
  role: 'owner' | 'user' | 'admin' | 'member';
  status: 'pending' | 'active' | 'suspended';
  type: 'individual' | 'business';
  relayerAddress: string;
  flags?: string[];
  walletAddress: string;
  walletId: string;
  walletAccountType: string;
}