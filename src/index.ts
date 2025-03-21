import { Context, Markup, Telegraf } from "telegraf";
import { authenticateOTP, getUserToken, requestOTP } from "./libs/auth";
import {
  escapeMarkdownV2,
  formatBalances,
  formatWallets,
  generateAIResponse,
  getWallet,
  getWalletBalances,
  getWalletDefault,
  sendFundsByEmail,
  setWalletDefault,
} from "./libs/utils";
import { pusher } from "./libs/pusher.js";
import dotenv from "dotenv";
import {
  connectRedis,
  getOTPData,
  getUserData,
  setOTPData,
  UserRedis,
} from "./libs/redis";
import { setSession } from "./libs/storage";
import QRCode from "qrcode";
import {
  Country,
  CreateOfframpTransferDto,
  createPaginationKeyboard,
  CreateSendTransferDto,
  CreateWalletWithdrawTransferDto,
  Currency,
  deletePayee,
  depositFunds,
  depositFundsPayload,
  fetchPayeeId,
  fetchTransfers,
  formatAmount,
  formatTransfersMessage,
  getAllPayee,
  getPayee,
  PurposeCode,
  RecipientRelationship,
  sendFunds,
  sendFundsPayload,
  SourceOfFunds,
  updatePayee,
  UpdatePayeeDto,
  validCountries,
  validCurrencies,
  validPurposeCodes,
  validRecipientRelationships,
  validSourceOfFunds,
  withdrawFunds,
  withdrawFundsEmail,
  withdrawFundsWallet,
} from "./libs/funds";

dotenv.config();

// Global flag to track transfer process state
let isTransferProcessActive = false;

// Session-based state management
interface SessionData {
  isTransferProcessActive: boolean;
}

// Extend the context type to include session data
interface MyContext extends Context {
  session?: SessionData;
}

const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN!, {
  telegram: { agent: undefined, webhookReply: true },
});

bot.use((ctx, next) => {
  if (!ctx.session) {
    ctx.session = { isTransferProcessActive: false };
  }
  return next();
});

// COMMANDS

// Start command
bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome to the Copperx Bot! 🚀\nWhat would you like to do?",
    Markup.inlineKeyboard([
      [Markup.button.callback("Check Balance", "balance")],
      [Markup.button.callback("Send Funds", "send")],
      [Markup.button.callback("Withdraw Funds", "withdraw")],
    ])
  );
});

// Start Action
bot.action("balance", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  if (!ctx.chat) return ctx.reply("Invalid chat.");

  const loadingMessage = await ctx.reply("Fetching balances...");

  try {
    const balances = await getWalletBalances(token.accessToken);
    const formattedBalances = formatBalances(balances);

    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      formattedBalances,
      { parse_mode: "MarkdownV2" }
    );
  } catch (error) {
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      "Failed to fetch balances."
    );
  }
});

bot.action("send", (ctx) => {
  ctx.reply("Please use the /send command to send funds.");
});

bot.action("withdraw", (ctx) => {
  ctx.reply("Please use the /withdraw command to withdraw funds.");
});

// Help command
bot.command("help", (ctx) => {
  ctx.reply(`
    Available commands:
    /start - Start the bot
    /help - Show help
    /balance - Check wallet balances
    /send - Send funds
    /withdraw - Withdraw funds
  `);
});

bot.command("login", async (ctx) => {
  const [email] = ctx.message.text.split(" ").slice(1);
  if (!email) {
    return ctx.reply("Usage: /login <email> \nThen send /verify <code>");
  }
  try {
    const token = await requestOTP(email);

    await setOTPData(ctx.from.id.toString(), { ...token });
    ctx.reply(
      `OTP sent successfully! \nVisit your email ${email} to get your OTP.\nThen send /verify <otp>`
    );
  } catch (error) {
    ctx.reply("OTP failed. Please try again.");
  }
});

bot.command("verify", async (ctx) => {
  const [otp] = ctx.message.text.split(" ").slice(1);
  if (!otp) {
    return ctx.reply("Usage: /verfiy <otp>");
  }
  const userId = ctx.from.id.toString();
  const meta = await getOTPData(userId);

  try {
    if (meta) {
      const { email, sid } = meta;
      const token = await authenticateOTP(email, otp, sid);
      await setSession(userId, { ...token });
      ctx.reply("Logged in successfully!");
    }
  } catch (error) {
    ctx.reply("Login failed. Please try again.");
  }
});

bot.command("email", async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    const data = await getUserData(userId);
    if (data) {
      console.log({ data });

      ctx.reply(`Email: ${data?.user.email}`);
    }
  } catch (error) {
    ctx.reply("User not logged in!");
  }
});

bot.command("me", async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    const token = await getUserData(userId);
    const user: UserRedis["user"] = token?.user as UserRedis["user"];

    ctx.reply(
      `*User Profile* 👤\n\n📧 *Email*: ${user.email}\n💳 *Wallet Address*: \n${
        user.walletAddress
      }\n🏦 *Wallet Type*: ${user.walletAccountType.toUpperCase()}\n✅ *Status*: ${user.status.toUpperCase()}`
    );
  } catch (error) {
    ctx.reply("User not logged in!");
  }
});

bot.command("send", async (ctx) => {
  const [email, amount] = ctx.message.text.split(" ").slice(1);
  if (!email || !amount) {
    return ctx.reply("Usage: /send <email> <amount>");
  }

  ctx.reply(
    `Are you sure you want to send ${amount} USDC to ${email}?`,
    Markup.inlineKeyboard([
      [Markup.button.callback("Yes", `confirm_send_${email}_${amount}`)],
      [Markup.button.callback("No", "cancel_send")],
    ])
  );
});

bot.action(/confirm_send_(.+)_(\d+)/, async (ctx) => {
  const [email, amount] = ctx.match[1].split("_");
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  try {
    const result = await sendFundsByEmail(
      token.accessToken,
      email,
      Number(amount)
    );
    ctx.reply(`Funds sent: ${JSON.stringify(result)}`);
  } catch (error) {
    ctx.reply("Failed to send funds.");
  }
});

bot.action("cancel_send", (ctx) => {
  ctx.reply("Send funds canceled.");
});

bot.command("wallets", async (ctx) => {
  ctx.reply(
    `Do you want to check your wallets?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Yes", `confirm_wallet`),
        Markup.button.callback("No", "cancel_wallet"),
      ],
      [Markup.button.callback("Show Default", "default_wallet")],
    ])
  );
});

bot.action("confirm_wallet", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  if (!ctx.chat) return ctx.reply("Invalid chat.");

  const loadingMessage = await ctx.reply("Fetching wallets...");

  try {
    const wallets = await getWallet(token.accessToken);
    const formattedBalances = formatWallets(wallets);

    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      formattedBalances,
      { parse_mode: "MarkdownV2" }
    );
  } catch (error) {
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      "Failed to fetch balances."
    );
  }
});

bot.action("cancel_wallet", (ctx) => {
  ctx.reply("Wallets check canceled.");
});

bot.action("default_wallet", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  if (!ctx.chat) return ctx.reply("Invalid chat.");

  const loadingMessage = await ctx.reply("Fetching wallet...");

  try {
    const wallet = await getWalletDefault(token.accessToken);
    const formattedBalances = `*Your Wallet*\n\n🌐 *Network*: ${wallet?.network.toUpperCase()}\n🔗 *Address*: ${
      wallet?.walletAddress || "unknown"
    }\n🤖 *Wallet Type*: ${(wallet?.walletType || "unknown")
      .replace("_", " ")
      .toUpperCase()}\n🪪 Wallet ID: ${
      wallet?.id || "unknown"
    }\n\n\nYou can change the default address:\n/wallet def <address>`;

    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      formattedBalances,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      "Failed to fetch balances."
    );
  }
});

bot.command("wallet", async (ctx) => {
  const [def, walletId] = ctx.message.text.split(" ").slice(1);
  const userId = ctx.from.id.toString();
  try {
    const token = await getUserData(userId);

    if (!token) return ctx.reply("User not logged in!");

    if (def === "def") {
      // TODO - fix the set api
      const wallet = await setWalletDefault(token.accessToken, walletId);

      if (!wallet)
        return ctx.reply("Could not update your details. Try agaim later.");

      return ctx.reply(
        `Wallet [${wallet.walletAddress}] is now your default wallet.`
      );
    }

    const wallet = await getWalletDefault(token?.accessToken);
    const formattedBalances = `*Your Wallet*\n\n🌐 *Network*: ${wallet?.network.toUpperCase()}\n🔗 *Address*: ${
      wallet?.walletAddress || "unknown"
    }\n🤖 *Wallet Type*: ${(wallet?.walletType || "unknown")
      .replace("_", " ")
      .toUpperCase()}\n🪪 Wallet ID: ${
      wallet?.id || "unknown"
    }\n\n\nYou can change the default address:\n/wallet def <address>`;

    ctx.reply(formattedBalances);
  } catch (error) {
    ctx.reply("User not logged in!");
  }
});

bot.command("receive", async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    // Get user data from Redis/session
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    // Get user's wallet address from your system
    const user: UserRedis["user"] = token.user;
    const walletAddress = user.walletAddress;
    const network = user.walletAccountType.toUpperCase();

    if (!walletAddress) {
      return ctx.reply("No wallet address found for your account.");
    }

    console.log({ walletAddress });

    // Generate QR Code
    const qrCode = await QRCode.toBuffer(walletAddress, {
      errorCorrectionLevel: "H",
      type: "png",
      width: 400,
      margin: 2,
    });

    // Create caption with wallet address
    const caption =
      `📥 **Deposit Address**\n\n` +
      `Network: ${network}\n` +
      `Address: \`${walletAddress}\`\n\n` +
      `Scan the QR code or copy the address above to send funds`;

    // Send QR code and address
    await ctx.replyWithPhoto(
      { source: qrCode },
      {
        caption: caption,
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Copy Address",
                callback_data: `copy_address_${walletAddress}`,
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error("Deposit error:", error);
    ctx.reply("Failed to generate deposit address. Please try again.");
  }
});

// Handle copy address button
bot.action(/copy_address_(.+)/, async (ctx) => {
  const walletAddress = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply(`Here's your wallet address:\n\`${walletAddress}\``, {
    parse_mode: "MarkdownV2",
  });
});

// Deposit command
bot.command("deposit", async (ctx) => {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(" ").slice(1);

  // Validate input
  if (args.length < 2) {
    return ctx.reply(
      "Usage: /deposit <amount> <depositChainId> <sourceOfFunds>"
    );
  }

  const [amount, depositChainId, sourceOfFunds = "savings"] = args;

  // Validate amount
  if (isNaN(parseFloat(amount))) {
    return ctx.reply("Invalid amount. Please provide a valid number.");
  }

  // Validate source of funds
  if (
    !validSourceOfFunds.includes(sourceOfFunds.toLowerCase() as SourceOfFunds)
  ) {
    return ctx.reply(
      `Invalid source of funds. Supported values: ${validSourceOfFunds.join(
        ", "
      )}`
    );
  }

  // Validate deposit chain ID
  if (isNaN(parseInt(depositChainId))) {
    return ctx.reply(
      "Invalid deposit chain ID. Please provide a valid number."
    );
  }

  // Ask for confirmation
  await ctx.reply(
    `Are you sure you want to deposit ${amount} USD (Source: ${sourceOfFunds}, Chain ID: ${depositChainId})?`,
    Markup.inlineKeyboard([
      Markup.button.callback(
        "Yes",
        `confirm_deposit_${amount}_${depositChainId}_${sourceOfFunds}`
      ),
      Markup.button.callback("No", "cancel_deposit"),
    ])
  );
});

// Handle confirmation
bot.action(/confirm_deposit_(.+)_(\d+)_(.+)/, async (ctx) => {
  const [amount, depositChainId, sourceOfFunds = "savings"] =
    ctx.match.slice(1); // Extract arguments from the regex match
  const userId = ctx.from.id.toString();

  try {
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    // Construct the payload
    const payload = {
      amount: formatAmount(amount),
      sourceOfFunds: sourceOfFunds,
      depositChainId: parseInt(depositChainId),
    };

    console.log("Payload:", payload); // Debugging: Log the payload

    const deposit = await depositFunds(
      token.accessToken,
      payload as unknown as depositFundsPayload
    );

    console.info("Response", deposit);

    const dash = escapeMarkdownV2("-");

    // Format the deposit details
    const depositDetails = `
    ✅ **${escapeMarkdownV2("Deposit Initiated Successfully!")}**

    **Deposit ID**: \`${deposit.id}\`
    **Status**: ${deposit.status}
    **Amount**: ${Number(deposit.amount) / 100_000_000} ${deposit.currency}
    **Chain ID**: ${depositChainId}

    **Source Account**:
    ${dash} **Type**: ${deposit.sourceAccount.type}
    ${dash} **Wallet Address**: \`${deposit.sourceAccount.walletAddress}\`
    ${dash} **Network**: ${deposit.sourceAccount.network}

    **Destination Account**:
    ${dash} **Type**: ${deposit.destinationAccount.type}
    ${dash} **Wallet Address**: \`${deposit.destinationAccount.walletAddress}\`
    ${dash} **Network**: ${deposit.destinationAccount.network}

    **Fees**: ${deposit.totalFee} ${deposit.feeCurrency}
        `;

    // Send the deposit details
    await ctx.replyWithMarkdownV2(depositDetails, {
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open Deposit Link",
              url: deposit.transactions[0].depositUrl, // Use the deposit URL from the response
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Deposit error:", error);

    console.error("Fund transfer error:", error);

    if (error instanceof Error && (error as any).response) {
      ctx.reply(
        `❌ Failed to deposit funds: ${
          (error as any).response.data.message || "Unknown error"
        }`
      );
    } else {
      ctx.reply("❌ An error occurred. Please try again later.");
    }
  }
});

// Handle cancellation
bot.action("cancel_deposit", (ctx) => {
  ctx.reply("Deposit canceled.");
});

// Command handler for /transfer
bot.command("transfer", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  // Ask the user whether they want to transfer to a wallet or email
  await ctx.reply(
    "How would you like to transfer funds?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("To Wallet", "transfer_wallet"),
        Markup.button.callback("To Email", "transfer_email"),
      ],
      [Markup.button.callback("Off-Ramp", "transfer_offramp")],
      [Markup.button.callback("Cancel", "cancel_transfer")],
    ])
  );

  // Handle wallet transfer
  bot.action("transfer_wallet", async (ctx) => {
    // Set the transfer process flag to true
    ctx.session!.isTransferProcessActive = true;

    await ctx.replyWithMarkdownV2(
      escapeMarkdownV2(
        "Please provide the following details in this format:\n\n" +
          "`<walletAddress> <amount> <purposeCode> <currency>`\n\n" +
          "Example: `0x123... 100000000 salary USD`\n\n" +
          "**Note: purposeCode and currency are set to gift and USD respectively by default.**"
      )
    );

    // Listen for the user's response
    bot.on("text", async (ctx) => {
      const [walletAddress, amount, purposeCode = "gift", currency = "USD"] =
        ctx.message.text.split(" ");

      // Validate input
      if (!walletAddress || !amount || !purposeCode) {
        return ctx.reply("Invalid input. Please provide all required fields.");
      }

      // Prepare the payload
      const payload: CreateWalletWithdrawTransferDto = {
        walletAddress,
        amount: formatAmount(amount) as string,
        purposeCode: purposeCode as PurposeCode,
        currency: currency as Currency,
      };

      // Ask for confirmation
      await ctx.reply(
        `Are you sure you want to transfer ${amount} ${
          currency || "USD"
        } to wallet ${walletAddress}?`,
        Markup.inlineKeyboard([
          Markup.button.callback("Yes", "confirm_wallet_transfer"),
          Markup.button.callback("No", "cancel_transfer"),
        ])
      );

      console.info("Payload", payload);

      // Handle confirmation
      bot.action("confirm_wallet_transfer", async (ctx) => {
        try {
          const transfer = await withdrawFundsWallet(
            token.accessToken,
            payload
          );
          const message = escapeMarkdownV2(`
            ✅ **Wallet Transfer Successful!**

            **Transfer ID**: \`${transfer.id}\`
            **Status**: ${transfer.status}
            **Amount**: ${transfer.amount} ${transfer.currency}
            **Wallet Address**: \`${transfer.destinationAccount.walletAddress}\`
          `);

          await ctx.replyWithMarkdownV2(message);
        } catch (error) {
          console.error("Wallet Transfer error:", error);
          ctx.reply(
            "❌ Failed to process wallet transfer. Please try again later."
          );
        } finally {
          // Reset the transfer process flag
          ctx.session!.isTransferProcessActive = false;
        }
      });
    });
  });

  // Handle email transfer
  bot.action("transfer_email", async (ctx) => {
    // Set the transfer process flag to true
    ctx.session!.isTransferProcessActive = true;

    await ctx.reply(
      "Please provide the following details in this format:\n\n" +
        "`<email> <amount> <purposeCode> <currency>`\n\n" +
        "Example: `user@example.com 100000000 gift USD\n\n`" +
        "**Note: purposeCode and currency are set to gift and USD respectively by default.**"
    );

    // Listen for the user's response
    bot.on("text", async (ctx) => {
      const [email, amount, purposeCode = "gift", currency = "USD"] =
        ctx.message.text.split(" ");

      // Validate input
      if (!email || !amount || !purposeCode) {
        return ctx.reply("Invalid input. Please provide all required fields.");
      }

      const payeeId = await fetchPayeeId(token.accessToken, email);

      console.log({ payeeId });

      // Prepare the payload
      const payload: CreateSendTransferDto = {
        payeeId,
        email,
        amount: formatAmount(amount) as string,
        purposeCode: purposeCode as PurposeCode,
        currency: currency as Currency,
      };

      console.log("Payload", payload);

      // Ask for confirmation
      await ctx.reply(
        `Are you sure you want to transfer ${amount} ${
          currency || "USD"
        } to email ${email}?`,
        Markup.inlineKeyboard([
          Markup.button.callback("Yes", "confirm_email_transfer"),
          Markup.button.callback("No", "cancel_transfer"),
        ])
      );

      // Handle confirmation
      bot.action("confirm_email_transfer", async (ctx) => {
        try {
          const transfer = await withdrawFundsEmail(token.accessToken, payload);
          const message = `
            ✅ **Email Transfer Successful!**

            **Transfer ID**: \`${transfer.id}\`
            **Status**: ${transfer.status}
            **Amount**: ${transfer.amount} ${transfer.currency}
            **Email**: ${transfer.customer.email}
          `;

          await ctx.replyWithMarkdownV2(message);
        } catch (error) {
          console.error("Email Transfer error:", error);
          ctx.reply(
            "❌ Failed to process email transfer. Please try again later."
          );
        } finally {
          // Reset the transfer process flag
          ctx.session!.isTransferProcessActive = false;
        }
      });
    });
  });

  bot.action("transfer_offramp", async (ctx) => {
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    // Initialize the payload object
    const payload: Partial<CreateOfframpTransferDto> = {
      customerData: {} as any, // Initialize customerData as an empty object
    };

    // Step 1: Ask for invoiceNumber
    await ctx.reply("Please provide the invoice number:");

    // Listen for the user's response
    bot.on("text", async (ctx) => {
      const text = ctx.message.text;

      // Step 1: Collect invoiceNumber
      if (!payload.invoiceNumber) {
        payload.invoiceNumber = text;
        await ctx.reply("Please provide the invoice URL:");
        return;
      }

      // Step 2: Collect invoiceUrl
      if (!payload.invoiceUrl) {
        payload.invoiceUrl = text;
        await ctx.reply(
          "Please provide the purpose code (e.g., self, salary, gift):"
        );
        return;
      }

      // Step 3: Collect purposeCode
      if (!payload.purposeCode) {
        if (!validPurposeCodes.includes(text as PurposeCode)) {
          return ctx.reply(
            `Invalid purpose code. Supported values: ${validPurposeCodes.join(
              ", "
            )}`
          );
        }
        payload.purposeCode = text as PurposeCode;
        await ctx.reply(
          "Please provide the source of funds (e.g., salary, savings):"
        );
        return;
      }

      // Step 4: Collect sourceOfFunds
      if (!payload.sourceOfFunds) {
        if (!validSourceOfFunds.includes(text as SourceOfFunds)) {
          return ctx.reply(
            `Invalid source of funds. Supported values: ${validSourceOfFunds.join(
              ", "
            )}`
          );
        }
        payload.sourceOfFunds = text as SourceOfFunds;
        await ctx.reply(
          "Please provide the recipient relationship (e.g., self, spouse):"
        );
        return;
      }

      // Step 5: Collect recipientRelationship
      if (!payload.recipientRelationship) {
        if (
          !validRecipientRelationships.includes(text as RecipientRelationship)
        ) {
          return ctx.reply(
            `Invalid recipient relationship. Supported values: ${validRecipientRelationships.join(
              ", "
            )}`
          );
        }
        payload.recipientRelationship = text as RecipientRelationship;
        await ctx.reply("Please provide the quote payload:");
        return;
      }

      // Step 6: Collect quotePayload
      if (!payload.quotePayload) {
        payload.quotePayload = text;
        await ctx.reply("Please provide the quote signature:");
        return;
      }

      // Step 7: Collect quoteSignature
      if (!payload.quoteSignature) {
        payload.quoteSignature = text;
        await ctx.reply("Please provide the preferred wallet ID:");
        return;
      }

      // Step 8: Collect preferredWalletId
      if (!payload.preferredWalletId) {
        payload.preferredWalletId = text;
        await ctx.reply("Please provide the customer's name:");
        return;
      }

      // Step 9: Collect customer's name
      if (!payload.customerData?.name) {
        payload.customerData!.name = text;
        await ctx.reply(
          "Please provide the customer's business name (if any):"
        );
        return;
      }

      // Step 10: Collect customer's business name
      if (!payload.customerData?.businessName) {
        payload.customerData!.businessName = text;
        await ctx.reply("Please provide the customer's email:");
        return;
      }

      // Step 11: Collect customer's email
      if (!payload.customerData?.email) {
        payload.customerData!.email = text;
        await ctx.reply(
          "Please provide the customer's country (e.g., usa, ind):"
        );
        return;
      }

      // Step 12: Collect customer's country
      if (!payload.customerData?.country) {
        if (!validCountries.includes(text as Country)) {
          return ctx.reply(
            `Invalid country. Supported values: ${validCountries
              .map((el) => el.toUpperCase())
              .join(", ")}`
          );
        }
        payload.customerData!.country = text as Country;
        await ctx.reply("Please provide the source of funds file (if any):");
        return;
      }

      // Step 13: Collect sourceOfFundsFile
      if (!payload.sourceOfFundsFile) {
        payload.sourceOfFundsFile = text;
        await ctx.reply("Please provide a note (if any):");
        return;
      }

      // Step 14: Collect note
      if (!payload.note) {
        payload.note = text;

        // All details collected, ask for confirmation
        await ctx.reply(
          `Are you sure you want to initiate the off-ramp transfer with the following details?\n\n` +
            `Invoice Number: ${payload.invoiceNumber}\n` +
            `Invoice URL: ${payload.invoiceUrl}\n` +
            `Purpose Code: ${payload.purposeCode}\n` +
            `Source of Funds: ${payload.sourceOfFunds}\n` +
            `Recipient Relationship: ${payload.recipientRelationship}\n` +
            `Quote Payload: ${payload.quotePayload}\n` +
            `Quote Signature: ${payload.quoteSignature}\n` +
            `Preferred Wallet ID: ${payload.preferredWalletId}\n` +
            `Customer Name: ${payload.customerData!.name}\n` +
            `Customer Business Name: ${payload.customerData!.businessName}\n` +
            `Customer Email: ${payload.customerData!.email}\n` +
            `Customer Country: ${payload.customerData!.country}\n` +
            `Source of Funds File: ${payload.sourceOfFundsFile}\n` +
            `Note: ${payload.note}`,
          Markup.inlineKeyboard([
            [Markup.button.callback("Yes", "confirm_withdraw")],
            [Markup.button.callback("No", "cancel_withdraw")],
          ])
        );
        return;
      }
    });

    // Handle confirmation
    bot.action("confirm_withdraw", async (ctx) => {
      try {
        // Format the response
        const transfer = await withdrawFunds(
          token.accessToken,
          payload as CreateOfframpTransferDto
        );
        const transferDetails = `
        ✅ **Off-Ramp Transfer Initiated Successfully\\!**

        **Transfer ID**: \`${transfer.id}\`
        **Status**: ${transfer.status}
        **Amount**: ${Number(transfer.amount) / 100_000_000} ${
          transfer.currency
        }
        **Source Country**: ${transfer.sourceCountry}
        **Destination Country**: ${transfer.destinationCountry}
        **Destination Currency**: ${transfer.destinationCurrency}

        **Source Account**:
        \\- **Type**: ${transfer.sourceAccount.type}
        \\- **Wallet Address**: \`${transfer.sourceAccount.walletAddress}\`
        \\- **Network**: ${transfer.sourceAccount.network}

        **Destination Account**:
        \\- **Type**: ${transfer.destinationAccount.type}
        \\- **Wallet Address**: \`${transfer.destinationAccount.walletAddress}\`
        \\- **Network**: ${transfer.destinationAccount.network}

        **Fees**: ${transfer.totalFee} ${transfer.feeCurrency}
      `;

        // Send the transfer details
        await ctx.replyWithMarkdownV2(transferDetails, {
          link_preview_options: { is_disabled: true },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Open Withdrawal Link",
                  url: transfer.paymentUrl,
                },
              ],
            ],
          },
        });
      } catch (error) {
        console.error("Off-Ramp Transfer error:", error);

        if (error instanceof Error && (error as any).response) {
          ctx.reply(
            `❌ Failed to initiate off-ramp transfer: ${
              (error as any).response.data.message || "Unknown error"
            }`
          );
        } else {
          ctx.reply("❌ An error occurred. Please try again later.");
        }
      }
    });

    // Handle cancellation
    bot.action("cancel_withdraw", (ctx) => {
      ctx.reply("Off-ramp transfer canceled.");
    });
  });

  // Handle cancellation
  bot.action("cancel_transfer", (ctx) => {
    // Reset the transfer process flag
    ctx.session!.isTransferProcessActive = false;

    ctx.reply("Transfer canceled.");
  });
});

// Define userPageState to track the current page for each user
const userPageState: Record<string, number> = {};

// Command handler for /transfers
bot.command("transfers", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  // Initialize the page state for the user
  userPageState[userId] = 1;

  try {
    // Fetch the first page of transfers
    const transfersResponse = await fetchTransfers(
      token.accessToken,
      userPageState[userId],
      10
    );

    // Format and send the transfers data
    const message = formatTransfersMessage(
      transfersResponse,
      userPageState[userId]
    );
    const keyboard = createPaginationKeyboard(
      transfersResponse,
      userPageState[userId]
    );

    await ctx.reply(message, {
      parse_mode: "MarkdownV2",
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    await ctx.reply("❌ Failed to fetch transfers. Please try again.");
  }

  // Handle "Refresh" button
  bot.action("refresh_page", async (ctx) => {
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      // Fetch the current page of transfers
      const transfersResponse = await fetchTransfers(
        token.accessToken,
        userPageState[userId],
        10
      );

      // Format and send the transfers data
      const message = formatTransfersMessage(
        transfersResponse,
        userPageState[userId]
      );
      const keyboard = createPaginationKeyboard(
        transfersResponse,
        userPageState[userId]
      );

      if (!ctx.chat) return ctx.reply("Invalid chat.");

      const loadingMessage = await ctx.reply("Refreshing...");

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        undefined,
        message,
        {
          parse_mode: "MarkdownV2",
          reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
        }
      );
    } catch (error) {
      console.error("Error refreshing page:", error);
      await ctx.reply("❌ Failed to refresh the page. Please try again.");
    }
  });

  // Handle "Next" button
  bot.action("next_page", async (ctx) => {
    const token = await getUserData(userId);

    // Increment the page
    userPageState[userId] += 1;

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      // Fetch the next page of transfers
      const transfersResponse = await fetchTransfers(
        token.accessToken,
        userPageState[userId],
        10
      );

      // Format and send the transfers data
      const message = formatTransfersMessage(
        transfersResponse,
        userPageState[userId]
      );
      const keyboard = createPaginationKeyboard(
        transfersResponse,
        userPageState[userId]
      );

      await ctx.editMessageText(message, {
        parse_mode: "MarkdownV2",
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });
    } catch (error) {
      console.error("Error fetching next page:", error);
      await ctx.reply("❌ Failed to fetch the next page. Please try again.");
    }
  });

  // Handle "Previous" button
  bot.action("prev_page", async (ctx) => {
    const token = await getUserData(userId);

    // Decrement the page
    userPageState[userId] -= 1;

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      // Fetch the previous page of transfers
      const transfersResponse = await fetchTransfers(
        token.accessToken,
        userPageState[userId],
        10
      );

      // Format and send the transfers data
      const message = formatTransfersMessage(
        transfersResponse,
        userPageState[userId]
      );
      const keyboard = createPaginationKeyboard(
        transfersResponse,
        userPageState[userId]
      );

      await ctx.editMessageText(message, {
        parse_mode: "MarkdownV2",
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });
    } catch (error) {
      console.error("Error fetching previous page:", error);
      await ctx.reply(
        "❌ Failed to fetch the previous page. Please try again."
      );
    }
  });
});

bot.command("beneficiaries", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  try {
    const payees = await getAllPayee(token.accessToken);

    if (payees.length === 0) {
      return ctx.reply("No beneficiaries found.");
    }

    let message = "📋 *Beneficiaries*\n\n";
    payees.forEach((payee) => {
      message +=
        `- 🆔 ID: \`${payee.id}\`\n` +
        `- 📛 Nickname: ${payee.nickName}\n` +
        `- 📧 Email: ${payee.email}\n\n`;
    });

    await ctx.reply(message, { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("Error fetching beneficiaries:", error);
    await ctx.reply("❌ Failed to fetch beneficiaries. Please try again.");
  }
});

bot.command("beneficiary", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  const [id] = ctx.message.text.split(" ").slice(1);
  if (!id) {
    return ctx.reply("Usage: /beneficiary <id>");
  }

  try {
    const payee = await getPayee(token.accessToken, id);
    const message =
      `📋 *Beneficiary Details*\n\n` +
      `- 🆔 ID: \`${payee.id}\`\n` +
      `- 📛 Nickname: ${payee.nickName}\n` +
      `- 📧 Email: ${payee.email}\n` +
      `- 📞 Phone: ${payee.phoneNumber || "N/A"}\n` +
      `- 🏦 Bank: ${payee.bankAccount.bankName}\n` +
      `- 🌍 Country: ${payee.bankAccount.country}\n`;

    await ctx.reply(message, { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("Error fetching beneficiary details:", error);
    await ctx.reply(
      "❌ Failed to fetch beneficiary details. Please try again."
    );
  }
});

bot.command("update-beneficiary", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  const [id] = ctx.message.text.split(" ").slice(1);
  if (!id) {
    return ctx.reply("Usage: /update-beneficiary <id>");
  }

  await ctx.reply("Please provide the new nickname:");
  bot.on("text", async (ctx) => {
    const nickName = ctx.message.text;

    const payload: UpdatePayeeDto = {
      nickName,
    };

    try {
      const payee = await updatePayee(token.accessToken, id, payload);
      await ctx.reply(`✅ Beneficiary updated successfully!\nID: ${payee.id}`);
    } catch (error) {
      console.error("Error updating beneficiary:", error);
      await ctx.reply("❌ Failed to update beneficiary. Please try again.");
    }
  });
});

bot.command("delete-beneficiary", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  const [id] = ctx.message.text.split(" ").slice(1);
  if (!id) {
    return ctx.reply("Usage: /delete-beneficiary <id>");
  }

  try {
    const result = await deletePayee(token.accessToken, id);
    await ctx.reply(
      `✅ Beneficiary deleted successfully!\nMessage: ${result.message}`
    );
  } catch (error) {
    console.error("Error deleting beneficiary:", error);
    await ctx.reply("❌ Failed to delete beneficiary. Please try again.");
  }
});

/////////////////////////////////////////////
/////////////////////////////////////////////

// Bot AI functionality
// bot.on("text", async (ctx) => {
//   const message = ctx.message.text;

//   // Ignore commands
//   if (message.startsWith("/")) {
//     return;
//   }

//   console.log(
//     "Is Transfer Process Active: ",
//     ctx.session?.isTransferProcessActive
//   );
//   // Check if the transfer process is active
//   if (ctx.session?.isTransferProcessActive) {
//     return; // Skip AI processing during transfer
//   }

//   // Show typing indicator
//   await ctx.replyWithChatAction("typing");

//   try {
//     const aiResponse = await generateAIResponse(message);
//     ctx.reply(aiResponse);
//   } catch (error) {
//     console.error("Error generating AI response:", error);
//     ctx.reply(
//       "Sorry, I'm having trouble generating a response. Please try again later."
//     );
//   }
// });

bot.catch((err, ctx) => {
  console.error("Error:", err);
  ctx.reply("An error occurred. Please try again later.");
});

const startBot = async () => {
  try {
    await connectRedis();
    console.log("Redis connected.");
    // Launch the bot
    bot
      .launch()
      .then(() => console.log("Bot is running..."))
      .catch((err) => console.error("Bot failed to start:", err));
  } catch (error) {
    console.log("Error occurred!", error);
  }
};

startBot();
