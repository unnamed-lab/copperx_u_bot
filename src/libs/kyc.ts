import axios from "axios";
import { escapeMarkdownV2 } from "./utils";
import { KycDto } from "../types/kyc";

// Function to fetch KYC details from the API
export const getKycDetails = async (accessToken: string, userId: string) => {
  try {
    const response = await axios.get<KycDto>(
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

export const getKycStatus = async (accessToken: string, email: string) => {
  try {
    const response = await axios.get<string>(
      `https://income-api.copperx.io/api/kycs/status/${email}`,
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
