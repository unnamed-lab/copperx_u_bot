// Define the KycDto type based on the API response
export interface KycDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: string; // e.g., "pending", "approved", "rejected"
  type: string; // e.g., "individual", "business"
  country: string;
  providerCode: string;
  kycProviderCode: string;
  kycDetailId: string;
  kybDetailId: string;
  kycDetail: {
    id: string;
    createdAt: string;
    updatedAt: string;
    organizationId: string;
    kybDetailId: string;
    nationality: string;
    firstName: string;
    lastName: string;
    middleName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    positionAtCompany: string;
    sourceOfFund: string;
    currentKycVerificationId: string;
    currentKycVerification: {
      id: string;
      createdAt: string;
      updatedAt: string;
      organizationId: string;
      kycDetailId: string;
      kycProviderCode: string;
      externalCustomerId: string;
      externalKycId: string;
      status: string;
      externalStatus: string;
      verifiedAt: string;
    };
    kycDocuments: {
      id: string;
      createdAt: string;
      updatedAt: string;
      organizationId: string;
      kycDetailId: string;
      documentType: string;
      status: string;
      frontFileName: string;
      backFileName: string;
    }[];
    kycUrl: string;
    uboType: string;
    percentageOfShares: number;
    joiningDate: string;
  };
  kybDetail: {
    id: string;
    createdAt: string;
    updatedAt: string;
    organizationId: string;
    companyName: string;
    companyDescription: string;
    website: string;
    incorporationDate: string;
    incorporationCountry: string;
    incorporationNumber: string;
    companyType: string;
    companyTypeOther: string;
    natureOfBusiness: string;
    natureOfBusinessOther: string;
    sourceOfFund: string;
    sourceOfFundOther: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email: string;
    phoneNumber: string;
    currentKybVerificationId: string;
    currentKybVerification: {
      id: string;
      createdAt: string;
      updatedAt: string;
      organizationId: string;
      kybDetailId: string;
      kybProviderCode: string;
      externalCustomerId: string;
      externalKybId: string;
      status: string;
      externalStatus: string;
      verifiedAt: string;
    };
    kybDocuments: {
      id: string;
      createdAt: string;
      updatedAt: string;
      organizationId: string;
      kybDetailId: string;
      documentType: string;
      status: string;
      frontFileName: string;
      backFileName: string;
    }[];
    kycDetails: any[]; // Adjust based on the actual structure
    sourceOfFundDescription: string;
    expectedMonthlyVolume: number;
    purposeOfFund: string;
    purposeOfFundOther: string;
    operatesInProhibitedCountries: boolean;
    taxIdentificationNumber: string;
    highRiskActivities: string[];
  };
  kycAdditionalDocuments: any[]; // Adjust based on the actual structure
  statusUpdates: string;
}
