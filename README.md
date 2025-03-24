# Copperx Telegram Bot

## 📋 Overview

The **Copperx Telegram Bot** is a powerful tool designed to simplify stablecoin transactions for individuals and businesses. Built to integrate seamlessly with **Copperx Payout's API**, this bot allows users to **deposit**, **withdraw**, and **transfer USDC** directly through Telegram, eliminating the need to visit the Copperx web app. The bot is developed using **TypeScript/Node.js** and adheres to best practices for clean, maintainable, and secure code.

**Live Bot**: [https://t.me/copperx_u_bot](https://t.me/copperx_u_bot)  
**Server Deployment**: [On Render](#)

---

## ✨ Features

- **Authentication**: Connect to your Copperx account using email OTP.
- **Profile Management**: View profile information and KYC status.
- **Wallet Management**: View wallets, check balances, and set default wallets.
- **Transaction History**: Review transaction history with detailed views.
- **Fund Transfers**: Send funds via email, wallet, or bank withdrawal.
- **Real-time Notifications**: Receive push notifications for new deposits.
- **Security**: Rate limiting, brute force protection, and secure session handling.

---

## 🛠️ Technology Stack

- **Framework**: Telegraf (Telegram Bot Framework for TypeScript)
- **Backend**: Node.js, TypeScript
- **Database**: Redis for session storage and OTP caching
- **Real-time Updates**: Pusher for deposit notifications
- **API Integration**: Copperx API for account management, wallets, and transactions

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- Redis instance
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Copperx API credentials

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/unnamed-lab/copperx_u_bot.git
   cd copperx_u_bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Rename `example.env` to `.env` in the project root and fill with your secret keys:

   ```bash
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   PUSHER_KEY=xxx
   PUSHER_CLUSTER=xxx
   PUSHER_SECRET=xxxx
   PUSHER_ID=xxxx
   COPPERX_API_KEY=your-copperx-api-key
   REDIS_URL=xxx
   OPENAI_API_KEY=your-openai-api-key
   ZUKI_API=xxx
   ```

4. Build the project:

   ```bash
   npm run build
   ```

5. Start the bot:

   ```bash
   npm start
   ```

---

## 📚 API Integration

The bot integrates with the **Copperx API** for all functionality. Here are the key integration points:

### Authentication

- **Email OTP Request**: `POST /api/auth/email-otp/request`
- **OTP Verification**: `POST /api/auth/email-otp/authenticate`
- **User Profile**: `GET /api/auth/me`

### Wallet Management

- **Get Wallets**: `GET /api/wallets`
- **Set Default Wallet**: `POST /api/wallets/default`
- **Get Default Wallet**: `GET /api/wallets/default`
- **Get Wallet Balances**: `GET /api/wallets/balances`
- **Get Transaction History**: `/api/transfers?page=1&limit=10`

### KYC Verification

- **Get KYC Status**: `GET /api/kycs`

### Fund Transfers

- **Email Transfer**: `/api/transfers/send`
- **Wallet Transfer**: `/api/transfers/wallet-withdraw`
- **Bank Withdrawal**: `/api/transfers/offramp`
- **Bulk Transfers**: `/api/transfers/send-batch`

### Notifications

- **Pusher Authentication**: `POST /api/notifications/auth`

---

## 📄 Project Structure

```bash
src/
├── index.ts            # Entry point
├── bot.ts              # Bot instance creation
├── middleware/         # Bot middleware configuration and setup
│   ├── authentication.ts     # Authentication middleware
│   └── rateLimit.ts    # Rate limiter middleware
├── commands/           # Command definitions
│   ├── auth.ts         # Authentication features
│   ├── beneficiary.ts  # Beneficiary features
│   ├── deposit.ts      # Deposit features
│   ├── help.ts         # Help information command
│   ├── kyc.ts          # KYC verification features
│   ├── logout.ts       # Logout feature
│   ├── notifications.ts  # Deposit notifications using Pusher
│   ├── send.ts         # Funds transfer (email) features
│   ├── start.ts        # Start features
│   ├── transactions.ts   # Transaction history features
│   └── wallet.ts       # Wallet management features
├── types/              # TypeScript type definitions
│   ├── context.ts      # Context types
│   ├── kyc.ts          # KYC types
│   ├── transaction.ts  # Transaction types
│   └── user.ts         # User and session types
├── handlers/           # Bot events handlers
│   ├── aiHandler.ts    # Handles ai event (if enabled)
│   ├── callbackHandler.ts    # Handles callbacks
│   ├── errorHandler.ts   # Handles error callbacks
│   └── pusherHandler.ts    # Handles Pusher events
└── libs/              # Library of functions used in the project
```

---

## 📜 Command Reference

| Command          | Description                            |
| ---------------- | -------------------------------------- |
| `/start`         | Start the bot and connect your account |
| `/login`         | Log in to your Copperx account         |
| `/profile`       | View your profile information          |
| `/kyc`           | Check your KYC verification status     |
| `/wallets`       | Access your wallet management menu     |
| `/balance`       | Check your account balance             |
| `/transactions`  | View your transaction history          |
| `/deposit`       | View deposit information               |
| `/send`          | Send funds via email or wallet         |
| `/withdraw`      | Withdraw funds to a bank account       |
| `/notifications` | Set up deposit notifications           |
| `/help`          | Get help and support                   |
| `/logout`        | Disconnect your account                |

---

## 🔒 Security Features

### Rate Limiting

The bot implements rate limiting to prevent abuse:

- Maximum of 5 authentication attempts within a 15-minute window.
- 30-minute cooldown after too many failed attempts.
- Proper user feedback about remaining attempts.

### Session Management

- Secure session storage in Redis.
- Session expiration based on token expiry.
- Session clearing on logout.

### Error Handling

- Comprehensive error logging.
- User-friendly error messages.
- Graceful degradation when API is unavailable.

---

## 🚧 Future Improvements

- In-bot KYC/KYB verification.
- Add two-factor authentication for high-value transactions.
- Allow users to schedule recurring or future-dated transactions.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 🙏 Acknowledgements

- [Telegraf](https://telegraf.js.org/) - Telegram Bot Framework for TypeScript.
- [Redis](https://redis.io/) - Database for session storage.
- [Pusher](https://pusher.com/) - Real-time notifications.
- [Copperx](https://copperx.io/) - API provider.

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
