# Copperx Telegram Bot

## 📋 Overview

The **Copperx Telegram Bot** is a powerful tool designed to simplify stablecoin transactions for individuals and businesses. Built to integrate seamlessly with **Copperx Payout's API**, this bot allows users to **deposit**, **withdraw**, and **transfer USDC** directly through Telegram, eliminating the need to visit the Copperx web app. The bot is developed using **TypeScript/Node.js** and adheres to best practices for clean, maintainable, and secure code.

This document outlines the project's technical requirements, core features, implementation details, and deliverables. It also provides instructions for setting up and running the bot.

---

## 🛠️ Technical Requirements

The bot is built with the following technical specifications:

- **Programming Language**: TypeScript/Node.js.
- **Framework**: Telegraf for Telegram bot development.
- **Code Quality**: Clean, modular, and maintainable code structure.
- **Version Control**: Comprehensive Git history with meaningful commit messages.
- **Type Safety**: Strong type safety enforced throughout the codebase.
- **Error Handling**: Robust error handling with clear user feedback.
- **Security**: Secure handling of user credentials and sensitive data.
- **Documentation**: Thorough documentation, including setup instructions and API integration details.

---

## 📚 API Documentation

The bot integrates with the **Copperx Payout API**, which provides endpoints for authentication, wallet management, fund transfers, and notifications. The complete API documentation is available at:  
[Copperx API Docs](https://income-api.copperx.io/api/doc).

If you encounter any issues or have questions, feel free to reach out to the Copperx team at:  
[Copperx Community](https://t.me/copperxcommunity/2991).

---

## ✨ Core Features

### 1. **Authentication & Account Management**
   - **Features**:
     - User login/authentication using Copperx credentials.
     - View account profile and status.
     - Check KYC/KYB approval status.
   - **API Endpoints**:
     - `/api/auth/email-otp/request`: Request OTP for login.
     - `/api/auth/email-otp/authenticate`: Authenticate using OTP.
     - `/api/auth/me`: Fetch user profile.
     - `/api/kycs`: Check KYC/KYB status.
   - **Implementation Notes**:
     - Redirect users to the Copperx platform if KYC/KYB is not approved.
     - Securely store session tokens and implement session refresh mechanisms.
     - Handle API rate limits gracefully.

---

### 2. **Wallet Management**
   - **Features**:
     - View wallet balances across multiple networks.
     - Set a default wallet for transactions.
     - Deposit funds into the wallet.
     - View transaction history.
   - **API Endpoints**:
     - `/api/wallets`: Fetch all wallets.
     - `/api/wallets/balances`: Fetch wallet balances.
     - `/api/wallets/default`: Set or fetch the default wallet.
     - `/api/transfers`: Fetch transaction history.
   - **Implementation Notes**:
     - Display wallet balances in a user-friendly format.
     - Allow users to set a default wallet for seamless transactions.

---

### 3. **Fund Transfers**
   - **Features**:
     - Send funds to email addresses.
     - Send funds to external wallet addresses.
     - Withdraw funds to bank accounts.
     - View the last 10 transactions.
   - **API Endpoints**:
     - `/api/transfers/send`: Send funds via email.
     - `/api/transfers/wallet-withdraw`: Withdraw funds to a wallet.
     - `/api/transfers/offramp`: Withdraw funds to a bank account.
     - `/api/transfers/send-batch`: Perform bulk transfers.
     - `/api/transfers?page=1&limit=10`: Fetch recent transactions.
   - **Implementation Notes**:
     - Validate recipient information before initiating transfers.
     - Display transaction fees and confirmations for security.

---

### 4. **Deposit Notifications**
   - **Features**:
     - Receive real-time deposit notifications via Pusher.
   - **API Endpoints**:
     - `/api/notifications/auth`: Authenticate Pusher connections.
   - **Implementation Notes**:
     - Use Pusher to subscribe to private channels (`private-org-${organizationId}`).
     - Listen for `deposit` events and notify users via Telegram.
     - Format notifications with relevant transaction details.

---

### 5. **Bot Interaction Design**
   - **Features**:
     - Intuitive command structure (e.g., `/balance`, `/send`, `/withdraw`).
     - Interactive menus and inline keyboards for complex operations.
     - Help commands and clear instructions for users.
     - Support for natural language queries.
   - **Implementation Notes**:
     - Use Markdown formatting for better readability.
     - Provide a link to Copperx support for additional assistance.

---

## 🔒 Security Considerations

- **Authentication**: Implement secure OTP-based login flows.
- **Session Management**: Store session tokens securely and handle session expiration.
- **Data Security**: Never store plaintext passwords or sensitive information.
- **Transaction Security**: Include confirmation steps for fund transfers.
- **Telegram Bot API Best Practices**: Follow Telegram's guidelines for secure bot development.

---

## 📦 Deliverables

1. **GitHub Repository**:
   - A complete repository with the bot's source code.
   - Include a detailed `README.md` for setup and usage instructions.

2. **Deployed Bot**:
   - Deploy the bot using a free hosting service like [Render](https://render.com/).
   - Provide the bot's username for testing.

3. **Documentation**:
   - **Setup Instructions**: Step-by-step guide for setting up the bot locally.
   - **API Integration Details**: Explanation of how the bot integrates with the Copperx API.
   - **Command Reference**: List of all available commands and their usage.
   - **Troubleshooting Guide**: Common issues and solutions.

4. **Optional**:
   - Showcase the bot on social media (e.g., X/Twitter) and tag Copperx.

---

## 🚀 Getting Started

### 1. **Clone the Repository**
   ```bash
   git clone https://github.com/unnamed-lab/copperx_u_bot.git
   cd copperx-telegram-bot
   ```

### 2. **Install Dependencies**
   ```bash
   npm install
   ```

### 3. **Set Up Environment Variables**
   Create a `.env` file and add the following variables:
   ```
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   PUSHER_KEY=xxx
   PUSHER_CLUSTER=xxx
   COPPERX_API_KEY=your-copperx-api-key
   REDIS_URL=xxx
   OPENAI_API_KEY=your-openai-api-key
   ZUKI_API=xxx
   ```

### 4. **Run the Bot**

   - For development:

     ```bash
     npm run dev
     ```

   - For production:
  
     ```bash
     npm run build
     npm start
     ```

---

## 📄 Documentation

For detailed documentation on setting up and using the bot, refer to the [Documentation](docs/README.md).

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guidelines](CONTRIBUTING.md) for more information.

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Copperx](https://copperx.io/) for providing the API and support.
- [Telegraf](https://telegraf.js.org/) for the Telegram bot framework.
- [Pusher](https://pusher.com/) for real-time notifications.
- [OpenAI](https://openai.com/) for AI-powered responses.
