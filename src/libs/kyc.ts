import axios from "axios";
import { Markup } from "telegraf";
import { escapeMarkdownV2 } from "./utils";

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

// Function to fetch KYC details from the API
export const getKycDetails = async (accessToken: string, userId: string) => {
  try {
    const response = await axios.get(
      `https://income-api.copperx.io/api/kycs/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Include the access token in the request
        },
      }
    );

    return response.data; // Return the KYC details
  } catch (error) {
    console.error("Error fetching KYC details:", error); // Log errors
    return null; // Return null if no KYC is found or if there's an error
  }
};

// Function to format KYC details into a readable message
export const formatKycDetails = (kycResponse: KycDto) => {
  const { status, type, country, kycDetail, kybDetail } = kycResponse;

  let message = `✅ *KYC Details* ✅\n\n`;

  // Add general KYC information
  message += `📋 *Status*: ${status}\n`;
  message += `👤 *Type*: ${type}\n`;
  message += `🌍 *Country*: ${country || "N/A"}\n\n`;

  // Add individual KYC details (if available)
  if (kycDetail) {
    message += `👤 *Individual Details*\n`;
    message += `- 🧑‍💼 *Name*: ${kycDetail.firstName} ${kycDetail.lastName}\n`;
    message += `- 📧 *Email*: ${kycDetail.email}\n`;
    message += `- 📞 *Phone*: ${kycDetail.phoneNumber}\n`;
    message += `- 🎂 *Date of Birth*: ${kycDetail.dateOfBirth}\n`;
    message += `- 🏠 *Address*: ${kycDetail.addressLine1}, ${kycDetail.city}, ${kycDetail.country}\n`;
    message += `- 📜 *Documents*: ${kycDetail.kycDocuments.length} uploaded\n\n`;
  }

  // Add business KYC details (if available)
  if (kybDetail) {
    message += `🏢 *Business Details*\n`;
    message += `- 🏛️ *Company Name*: ${kybDetail.companyName}\n`;
    message += `- 🌐 *Website*: ${kybDetail.website || "N/A"}\n`;
    message += `- 📅 *Incorporation Date*: ${kybDetail.incorporationDate}\n`;
    message += `- 🏙️ *Address*: ${kybDetail.addressLine1}, ${kybDetail.city}, ${kybDetail.country}\n`;
    message += `- 📜 *Documents*: ${kybDetail.kybDocuments.length} uploaded\n\n`;
  }

  return escapeMarkdownV2(message); // Escape MarkdownV2 characters
};
