import { CallbackQuery, Update } from "telegraf/typings/core/types/typegram";
import { getUserData, UserRedis } from "../libs/redis";
import {
  chains,
  escapeMarkdownV2,
  formatBalances,
  getWalletBalances,
  getWalletDefault,
  getWalletDefaultBalance,
} from "../libs/utils";
import { MyContext } from "../types/context";
import { Context, Markup, Telegraf } from "telegraf";
import {
  chunkCurrencies,
  chunkPurposeCodes,
  currencies,
  depositFunds,
  formatAmount,
  getAllPayee,
  getPayee,
  purposeCodes,
  validCountries,
  validPurposeCodes,
  validRecipientRelationships,
  validSourceOfFunds,
  withdrawFunds,
  withdrawFundsEmail,
  withdrawFundsWallet,
} from "../libs/funds";
import {
  Country,
  CreateOfframpTransferDto,
  CreateSendTransferDto,
  CreateWalletWithdrawTransferDto,
  Currency,
  depositFundsPayload,
  OfframpQuoteRequestDto,
  PurposeCode,
  RecipientRelationship,
  SourceOfFunds,
} from "../types/transactions";
import QRCode from "qrcode";
import { AuthService } from "../services/authService";

/**
 * Generates a help message for the Copperx Bot with a list of available commands.
 * The message is formatted using MarkdownV2 for better readability in messaging platforms.
 *
 * The help message includes the following sections:
 * - Authentication: Commands for logging in and verifying OTP.
 * - Wallet Management: Commands for checking balances, viewing wallet details, setting a default wallet, and receiving funds.
 * - Transfers: Commands for sending funds, initiating transfers, and withdrawing funds.
 * - Beneficiaries: Commands for managing saved beneficiaries.
 * - Transactions: Command for viewing transaction history.
 * - Support: Information on how to get help and support.
 *
 * @returns {string} The formatted help message.
 */
const helpMessage = escapeMarkdownV2(
  "🛠️ *Copperx Bot Help* 🛠️\n\n" +
    "Here are the commands you can use:\n\n" +
    "🔐 *Authentication*\n" +
    "`/login` - Log in with your email.\n\n" +
    "💼 *Wallet Management*\n" +
    "`/balance` - Check your wallet balances.\n" +
    "`/wallets` - View your wallet details.\n" +
    "`/wallet` - View and set a default wallet.\n" +
    "`/receive` - Get your wallet address and QR code.\n\n" +
    "💸 *Transfers*\n" +
    "`/send` - Send funds to an email.\n" +
    "`/transfer` - Initiate a transfer (wallet, email, or off-ramp).\n" +
    "`/withdraw` - Withdraw funds to your bank account.\n\n" +
    "📋 *Beneficiaries*\n" +
    "`/beneficiaries` - View your saved beneficiaries.\n" +
    "`/beneficiary <id>` - View details of a specific beneficiary.\n" +
    "`/addBeneficiary` - Add a beneficiary's details.\n" +
    "`/updateBeneficiary <id>` - Update a beneficiary's details.\n" +
    "`/deleteBeneficiary <id>` - Delete a beneficiary.\n\n" +
    "📄 *Transactions*\n" +
    "`/transfers` - View your transaction history.\n\n" +
    "❓ *Support*\n" +
    "Need help? Click the button below to visit our support page."
);

export const helpCallback = async (ctx: MyContext) => {
  ctx.reply(helpMessage, {
    parse_mode: "MarkdownV2",
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.button.url(
          "Copperx Support",
          "https://t.me/copperxcommunity/2183"
        ),
      ],
    ]).reply_markup,
  });
};

export const balanceCallback = async (
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>
) => {
  if (!ctx.from) return ctx.reply("Invalid user."); // Handle undefined 'from'
  const userId = ctx.from.id.toString(); // Get user ID
  const token = await getUserData(userId); // Fetch user data

  if (!token) {
    return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
  }

  if (!ctx.chat) return ctx.reply("Invalid chat."); // Handle invalid chat

  const loadingMessage = await ctx.reply("Fetching balances..."); // Show loading message

  try {
    const balances = await getWalletBalances(token.accessToken); // Fetch wallet balances
    const formattedBalances = formatBalances(balances); // Format balances for display

    // Update the loading message with the formatted balances
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      formattedBalances
    );
  } catch (error) {
    // Handle errors
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      "Failed to fetch balances."
    );
  }
};

export const transferWalletCallback = async (
  bot: Telegraf<MyContext>,
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>,
  token: UserRedis | null
) => {
  // Set the transfer process flag to true
  ctx.session!.isTransferProcessActive = true;

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  // Initialize the payload
  const transferPayload: Partial<CreateWalletWithdrawTransferDto> = {};

  // Ask for the wallet address
  await ctx.reply(
    "Please provide the wallet address:",
    Markup.inlineKeyboard([
      Markup.button.callback("⬅️ Back", "back_to_transfer_options"),
      Markup.button.callback("❌ Cancel", "cancel_transfer"),
    ])
  );

  // Listen for the user's response
  bot.on("text", async (ctx) => {
    const text = ctx.message.text;

    if (!transferPayload.walletAddress) {
      transferPayload.walletAddress = text;

      // Ask for the amount
      await ctx.reply(
        "Please enter the amount to transfer:",
        Markup.inlineKeyboard([
          Markup.button.callback("⬅️ Back", "back_to_wallet_address"),
          Markup.button.callback("❌ Cancel", "cancel_transfer"),
        ])
      );
      return;
    }

    if (!transferPayload.amount) {
      // Validate amount
      if (isNaN(parseFloat(text))) {
        return ctx.reply("❌ Invalid amount. Please enter a valid number.");
      }

      transferPayload.amount = formatAmount(text) as string;

      // Ask for the purpose code
      await ctx.reply(
        "Please select the purpose code:",
        Markup.inlineKeyboard([
          ...chunkPurposeCodes(purposeCodes, 2).map((chunk) =>
            chunk.map((purpose) =>
              Markup.button.callback(
                purpose.replace("_", " ").toUpperCase(),
                `purpose_code_${purpose}`
              )
            )
          ),
          [Markup.button.callback("⬅️ Back", "back_to_amount")],
          [Markup.button.callback("❌ Cancel", "cancel_transfer")],
        ])
      );
      return;
    }

    if (!transferPayload.purposeCode) {
      return; // Purpose code is handled by buttons
    }

    if (!transferPayload.currency) {
      // Ask for the currency
      await ctx.reply(
        "Please select the currency:",
        Markup.inlineKeyboard([
          // Uncomment and use if other currencies are available
          //   ...chunkCurrencies(currencies, 3).map((chunk) =>
          //     chunk.map((currency) =>
          //       Markup.button.callback(currency, `currency_${currency}`)
          //     )
          //   ),
          [Markup.button.callback("USDC", `currency_USDC`)],
          [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
          [Markup.button.callback("❌ Cancel", "cancel_transfer")],
        ])
      );
      return;
    }
  });

  // Handle purpose code selection
  bot.action(/purpose_code_(.+)/, async (ctx) => {
    const purposeCode = ctx.match[1] as PurposeCode;
    transferPayload.purposeCode = purposeCode;

    // Ask for the currency
    await ctx.reply(
      "Please select the currency:",
      Markup.inlineKeyboard([
        // Uncomment and use if other currencies are available
        //   ...chunkCurrencies(currencies, 3).map((chunk) =>
        //     chunk.map((currency) =>
        //       Markup.button.callback(currency, `currency_${currency}`)
        //     )
        //   ),
        [Markup.button.callback("USDC", `currency_USDC`)],
        [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
        [Markup.button.callback("❌ Cancel", "cancel_transfer")],
      ])
    );
  });

  // Handle currency selection
  bot.action(/currency_(.+)/, async (ctx) => {
    const currency = ctx.match[1] as Currency;
    transferPayload.currency = currency;

    // Confirm the transfer
    await ctx.reply(
      `Are you sure you want to transfer ${
        Number(transferPayload.amount) / 100_000_000
      } ${currency} to wallet ${transferPayload.walletAddress}?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Confirm", "confirm_wallet_transfer")],
        [Markup.button.callback("⬅️ Back", "back_to_currency")],
        [Markup.button.callback("❌ Cancel", "cancel_transfer")],
      ])
    );
  });

  // Handle transfer confirmation
  bot.action("confirm_wallet_transfer", async (ctx) => {
    console.log("Payload", transferPayload);

    const balance = await getWalletDefaultBalance(token.accessToken);
    if (parseFloat(balance.balance) < parseFloat(transferPayload.amount!)) {
      return ctx.reply("❌ Insufficient balance. Please try again.");
    }

    try {
      const transfer = await withdrawFundsWallet(
        token.accessToken,
        transferPayload as CreateWalletWithdrawTransferDto
      );

      await ctx.replyWithMarkdownV2(`
              ✅ **Wallet Transfer Successful!**
    
              **Transfer ID**: \`${transfer.id}\`
              **Status**: ${transfer.status}
              **Amount**: ${Number(transfer.amount) / 100_000_000} ${
        transfer.currency
      }
              **Wallet Address**: \`${
                transfer.destinationAccount.walletAddress
              }\`
            `);
    } catch (error) {
      console.error("Wallet Transfer error:", error);
      await ctx.reply(
        "❌ Failed to process wallet transfer. Please try again."
      );
    } finally {
      // Reset the transfer process flag
      ctx.session!.isTransferProcessActive = false;
    }
  });

  // Handle back to transfer options
  bot.action("back_to_transfer_options", async (ctx) => {
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
  });

  // Handle back to wallet address
  bot.action("back_to_wallet_address", async (ctx) => {
    transferPayload.walletAddress = undefined;
    await ctx.reply(
      "Please provide the wallet address:",
      Markup.inlineKeyboard([
        Markup.button.callback("⬅️ Back", "back_to_transfer_options"),
        Markup.button.callback("❌ Cancel", "cancel_transfer"),
      ])
    );
  });

  // Handle back to amount
  bot.action("back_to_amount", async (ctx) => {
    transferPayload.amount = undefined;
    await ctx.reply(
      "Please enter the amount to transfer:",
      Markup.inlineKeyboard([
        Markup.button.callback("⬅️ Back", "back_to_wallet_address"),
        Markup.button.callback("❌ Cancel", "cancel_transfer"),
      ])
    );
  });

  // Handle back to purpose code
  bot.action("back_to_purpose_code", async (ctx) => {
    transferPayload.purposeCode = undefined;
    await ctx.reply(
      "Please select the purpose code:",
      Markup.inlineKeyboard([
        ...chunkPurposeCodes(purposeCodes, 2).map((chunk) =>
          chunk.map((purpose) =>
            Markup.button.callback(
              purpose.replace("_", " ").toUpperCase(),
              `purpose_code_${purpose}`
            )
          )
        ),
        [Markup.button.callback("⬅️ Back", "back_to_amount")],
        [Markup.button.callback("❌ Cancel", "cancel_transfer")],
      ])
    );
  });

  // Handle back to currency
  bot.action("back_to_currency", async (ctx) => {
    transferPayload.currency = undefined;
    await ctx.reply(
      "Please select the currency:",
      Markup.inlineKeyboard([
        // Uncomment and use if other currencies are available
        //   ...chunkCurrencies(currencies, 3).map((chunk) =>
        //     chunk.map((currency) =>
        //       Markup.button.callback(currency, `currency_${currency}`)
        //     )
        //   ),
        [Markup.button.callback("USDC", `currency_USDC`)],
        [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
        [Markup.button.callback("❌ Cancel", "cancel_transfer")],
      ])
    );
  });
};

export const transferEmailCallback = async (
  bot: Telegraf<MyContext>,
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>,
  token: UserRedis | null
) => {
  // Set the transfer process flag to true
  ctx.session!.isTransferProcessActive = true;

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  // Fetch payees
  try {
    const payees = await getAllPayee(token.accessToken);

    if (payees.length === 0) {
      return ctx.reply(
        "No beneficiaries found. Please add a beneficiary first."
      );
    }

    // Create buttons for each payee
    const payeeButtons = payees.map((payee) => [
      Markup.button.callback(
        `${payee.nickName} (${payee.id.slice(0, 12)})`,
        `select_payee_${payee.id}`
      ),
    ]);

    // Add a cancel button
    payeeButtons.push([Markup.button.callback("❌ Cancel", "cancel_transfer")]);

    // Ask the user to select a payee
    await ctx.reply(
      "Select a beneficiary to transfer funds to:",
      Markup.inlineKeyboard(payeeButtons)
    );
  } catch (error) {
    console.error("Error fetching payees:", error);
    return ctx.reply("❌ Failed to fetch beneficiaries. Please try again.");
  }

  // Handle payee selection
  bot.action(/select_payee_(.+)/, async (ctx) => {
    const payeeId = ctx.match[1]; // Extract payee ID from the callback data

    // Fetch payee details
    try {
      const payee = await getPayee(token.accessToken, payeeId);

      // Store payee ID and email in the payload
      const transferPayload: Partial<CreateSendTransferDto> = {
        payeeId: payee.id,
        email: payee.email,
      };

      // Ask for the amount
      await ctx.reply(
        `You selected ${payee.nickName} (${payee.id.slice(
          0,
          12
        )}).\n\nPlease enter the amount to transfer:`,
        Markup.inlineKeyboard([
          Markup.button.callback("⬅️ Back", "back_to_payee_selection"),
          Markup.button.callback("❌ Cancel", "cancel_transfer"),
        ])
      );

      // Handle amount input
      bot.on("text", async (ctx) => {
        const text = ctx.message.text;

        if (text.startsWith("/")) {
          return; // Ignore commands
        }

        if (!transferPayload.amount) {
          // Validate amount
          if (isNaN(parseFloat(text))) {
            return ctx.reply("❌ Invalid amount. Please enter a valid number.");
          }

          transferPayload.amount = formatAmount(text) as string;

          // Ask for the purpose code
          await ctx.reply(
            "Please select the purpose code:",
            Markup.inlineKeyboard([
              ...chunkPurposeCodes(purposeCodes, 2).map((chunk) =>
                chunk.map((purpose) =>
                  Markup.button.callback(
                    purpose.replace("_", " ").toUpperCase(),
                    `purpose_code_${purpose}`
                  )
                )
              ),
              [Markup.button.callback("⬅️ Back", "back_to_amount")],
              [Markup.button.callback("❌ Cancel", "cancel_transfer")],
            ])
          );
          return;
        }

        if (!transferPayload.purposeCode) {
          return; // Purpose code is handled by buttons
        }

        if (!transferPayload.currency) {
          // Ask for the currency
          await ctx.reply(
            "Please select the currency:",
            Markup.inlineKeyboard([
              // Uncomment and use if other currencies are available
              //   ...chunkCurrencies(currencies, 3).map((chunk) =>
              //     chunk.map((currency) =>
              //       Markup.button.callback(currency, `currency_${currency}`)
              //     )
              //   ),
              [Markup.button.callback("USDC", `currency_USDC`)],
              [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
              [Markup.button.callback("❌ Cancel", "cancel_transfer")],
            ])
          );
          return;
        }
      });

      // Handle purpose code selection
      bot.action(/purpose_code_(.+)/, async (ctx) => {
        const purposeCode = ctx.match[1] as PurposeCode;
        transferPayload.purposeCode = purposeCode;

        // Ask for the currency
        await ctx.reply(
          "Please select the currency:",
          Markup.inlineKeyboard([
            // Uncomment and use if other currencies are available
            //   ...chunkCurrencies(currencies, 3).map((chunk) =>
            //     chunk.map((currency) =>
            //       Markup.button.callback(currency, `currency_${currency}`)
            //     )
            //   ),
            [Markup.button.callback("USDC", `currency_USDC`)],
            [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
            [Markup.button.callback("❌ Cancel", "cancel_transfer")],
          ])
        );
      });

      // Handle currency selection
      bot.action(/currency_(.+)/, async (ctx) => {
        const currency = ctx.match[1] as Currency;
        transferPayload.currency = currency;

        // Confirm the transfer
        await ctx.reply(
          `Are you sure you want to transfer ${
            Number(transferPayload.amount) / 100_000_000
          } ${currency} to ${transferPayload.email}?`,
          Markup.inlineKeyboard([
            [Markup.button.callback("✅ Confirm", "confirm_email_transfer")],
            [Markup.button.callback("⬅️ Back", "back_to_currency")],
            [Markup.button.callback("❌ Cancel", "cancel_transfer")],
          ])
        );
      });

      // Handle transfer confirmation
      bot.action("confirm_email_transfer", async (ctx) => {
        try {
          console.log("Payload", transferPayload);

          const balance = await getWalletDefaultBalance(token.accessToken);
          if (
            parseFloat(balance.balance) < parseFloat(transferPayload.amount!)
          ) {
            return ctx.reply("❌ Insufficient balance. Please try again.");
          }

          const transfer = await withdrawFundsEmail(
            token.accessToken,
            transferPayload as CreateSendTransferDto
          );

          await ctx.replyWithMarkdownV2(
            escapeMarkdownV2(`
                  ✅ **Email Transfer Successful!**
    
                  **Transfer ID**: \`${transfer.id}\`
                  **Status**: ${transfer.status}
                  **Amount**: ${Number(transfer.amount) / 100_000_000} ${
              transfer.currency
            }
                  **Recipient**: ${transfer.customer.email}
                `)
          );
        } catch (error) {
          console.error("Email Transfer error:", error);
          await ctx.reply(
            "❌ Failed to process email transfer. Please try again."
          );
        } finally {
          // Reset the transfer process flag
          ctx.session!.isTransferProcessActive = false;
        }
      });
    } catch (error) {
      console.error("Error fetching payee details:", error);
      return ctx.reply("❌ Failed to fetch payee details. Please try again.");
    }
  });
};

export const transferOffRampCallback = async (
  bot: Telegraf<MyContext>,
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>,
  token: UserRedis | null
) => {
  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  // Initialize payload objects
  const quoteRequest: Partial<OfframpQuoteRequestDto> = {
    currency: "USDC",
    onlyRemittance: false,
  };
  const transferPayload: Partial<CreateOfframpTransferDto> = {
    customerData: {} as any,
  };

  // Track conversation state
  let currentStep = 0;
  const commonSteps = [
    {
      question: "Please provide the amount to transfer (minimum 1 USDC):",
      field: "amount",
      validate: (text: string) => {
        const amount = parseFloat(text);
        return !isNaN(amount) && amount >= 1;
      },
      set: (text: string) => {
        const amount = Math.floor(parseFloat(text) * 1000000); // Convert to smallest unit
        quoteRequest.amount = amount.toString();
      },
    },
    {
      question: "Please provide the source country code (e.g., USA):",
      field: "sourceCountry",
      validate: validateCountry,
      set: (text: string) => {
        quoteRequest.sourceCountry = text.toLowerCase() as Country;
      },
    },
    {
      question: "Please provide the destination country code (e.g., NGA):",
      field: "destinationCountry",
      validate: validateCountry,
      set: (text: string) => {
        quoteRequest.destinationCountry = text.toLowerCase() as Country;
      },
    },
    {
      question: "Is this a remittance only transfer? (yes/no, default: no)",
      field: "onlyRemittance",
      parse: parseYesNo,
      set: (text: string) => {
        const value = parseYesNo(text);
        quoteRequest.onlyRemittance = value;
        transferPayload.onlyRemittance = value;
      },
    },
    {
      question: "Please provide preferred bank account ID (if any):",
      field: "preferredBankAccountId",
      optional: true,
      set: (text: string) => {
        quoteRequest.preferredBankAccountId = text;
      },
    },
  ];

  const largeTransferSteps = [
    {
      question: "Please provide the invoice number:",
      field: "invoiceNumber",
      set: (text: string) => (transferPayload.invoiceNumber = text),
    },
    {
      question: "Please provide the invoice URL:",
      field: "invoiceUrl",
      validate: validateUrl,
      set: (text: string) => (transferPayload.invoiceUrl = text),
    },
    {
      question: `Please provide the purpose code:\n(${validPurposeCodes.join(
        ", "
      )})`,
      field: "purposeCode",
      validate: (text: string) => validateEnum(text, validPurposeCodes),
      set: (text: string) =>
        (transferPayload.purposeCode = text as PurposeCode),
    },
    {
      question: `Please provide the source of funds:\n(${validSourceOfFunds.join(
        ", "
      )})`,
      field: "sourceOfFunds",
      validate: (text: string) => validateEnum(text, validSourceOfFunds),
      set: (text: string) =>
        (transferPayload.sourceOfFunds = text as SourceOfFunds),
    },
    {
      question: `Please provide the recipient relationship:\n(${validRecipientRelationships.join(
        ", "
      )})`,
      field: "recipientRelationship",
      validate: (text: string) =>
        validateEnum(text, validRecipientRelationships),
      set: (text: string) =>
        (transferPayload.recipientRelationship = text as RecipientRelationship),
    },
    {
      question: "Please provide the customer's full name:",
      field: "customerData.name",
      set: (text: string) => {
        transferPayload.customerData = transferPayload.customerData || {};
        transferPayload.customerData.name = text;
      },
    },
    {
      question: "Please provide the customer's business name (if any):",
      field: "customerData.businessName",
      optional: true,
      set: (text: string) => {
        transferPayload.customerData = transferPayload.customerData || {};
        transferPayload.customerData.businessName = text;
      },
    },
    {
      question: "Please provide the customer's email:",
      field: "customerData.email",
      validate: validateEmail,
      set: (text: string) => {
        transferPayload.customerData = transferPayload.customerData || {};
        transferPayload.customerData.email = text.toLowerCase();
      },
    },
    {
      question: "Please provide the customer's country code:",
      field: "customerData.country",
      validate: validateCountry,
      set: (text: string) => {
        transferPayload.customerData = transferPayload.customerData || {};
        transferPayload.customerData.country = text.toLowerCase() as Country;
      },
    },
    {
      question: "Please upload source of funds document (provide description):",
      field: "sourceOfFundsFile",
      set: (text: string) => (transferPayload.sourceOfFundsFile = text),
    },
    {
      question: "Please add any additional notes:",
      field: "note",
      optional: true,
      set: (text: string) => (transferPayload.note = text),
    },
  ];

  // Helper function to generate quote
  const generateQuote = async (): Promise<{
    quotePayload: string;
    quoteSignature: string;
  }> => {
    try {
      const response = await axios.post(
        "/api/transfers/offramp/quote",
        quoteRequest,
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        quotePayload: JSON.stringify(response.data.quote),
        quoteSignature: response.data.signature,
      };
    } catch (error) {
      console.error("Quote generation failed:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to generate transfer quote. Please try again."
      );
    }
  };

  // Helper function to ask next question
  const askNextQuestion = async (ctx: MyContext) => {
    const allSteps = [...commonSteps];
    const amount = parseFloat(quoteRequest.amount || "0") / 1000000;

    if (amount >= 120) {
      allSteps.push(...largeTransferSteps);
    }

    if (currentStep < allSteps.length) {
      const step = allSteps[currentStep];
      await ctx.reply(step.question);
    } else {
      // Generate quote before final confirmation
      try {
        const loadingMsg = await ctx.reply("⏳ Generating transfer quote...");
        const { quotePayload, quoteSignature } = await generateQuote();
        transferPayload.quotePayload = quotePayload;
        transferPayload.quoteSignature = quoteSignature;

        await ctx.deleteMessage(loadingMsg.message_id);
        await confirmTransfer(ctx);
      } catch (error) {
        await ctx.reply(`❌ ${error.message}`);
        currentStep = 0;
        await askNextQuestion(ctx);
      }
    }
  };

  // Confirm before submitting
  const confirmTransfer = async (ctx: MyContext) => {
    const amount = parseFloat(quoteRequest.amount || "0") / 1000000;
    const source = quoteRequest.sourceCountry?.toUpperCase();
    const destination = quoteRequest.destinationCountry?.toUpperCase();

    let confirmationText =
      `📋 *Transfer Confirmation*\n\n` +
      `*Amount:* ${amount} USDC\n` +
      `*From:* ${source} → *To:* ${destination}\n` +
      `*Type:* ${quoteRequest.onlyRemittance ? "Remittance" : "Standard"}\n`;

    if (amount >= 120) {
      confirmationText +=
        `\n*Compliance Details:*\n` +
        `• Purpose: ${transferPayload.purposeCode}\n` +
        `• Funds Source: ${transferPayload.sourceOfFunds}\n` +
        `• Recipient: ${transferPayload.recipientRelationship}\n` +
        `• Invoice: ${transferPayload.invoiceNumber}\n`;
    }

    confirmationText += `\nPlease confirm all details are correct.`;

    await ctx.replyWithMarkdown(
      confirmationText,
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Confirm Transfer", "confirm_withdraw")],
        [Markup.button.callback("🔄 Edit Details", "edit_transfer")],
        [Markup.button.callback("❌ Cancel", "cancel_withdraw")],
      ])
    );
  };

  // Start the conversation
  await askNextQuestion(ctx);

  // Handle user responses
  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const allSteps = [...commonSteps];
    const amount = parseFloat(quoteRequest.amount || "0") / 1000000;

    if (amount >= 120) {
      allSteps.push(...largeTransferSteps);
    }

    if (currentStep >= allSteps.length) {
      return ctx.reply("Please confirm or edit the transfer details.");
    }

    const step = allSteps[currentStep];

    // Handle optional fields
    if (step.optional && (text === "" || text.toLowerCase() === "skip")) {
      currentStep++;
      return askNextQuestion(ctx);
    }

    // Handle validation
    if (step.validate && !step.validate(text)) {
      let errorMsg = `Invalid ${step.field}.`;
      if (step.field === "amount") errorMsg = "Minimum transfer is 1 USDC";
      if (step.field === "email") errorMsg = "Please enter a valid email";
      if (step.field === "invoiceUrl") errorMsg = "Please enter a valid URL";

      return ctx.reply(`${errorMsg}\n\n${step.question}`);
    }

    // Set the value using the step's set function
    if (step.set) {
      step.set(text);
    } else if (step.parse) {
      const value = step.parse(text);
      quoteRequest[step.field as keyof OfframpQuoteRequestDto] = value;
      transferPayload[step.field as keyof CreateOfframpTransferDto] = value;
    } else {
      quoteRequest[step.field as keyof OfframpQuoteRequestDto] = text as any;
      transferPayload[step.field as keyof CreateOfframpTransferDto] =
        text as any;
    }

    currentStep++;
    await askNextQuestion(ctx);
  });

  // Handle transfer confirmation
  bot.action("confirm_withdraw", async (ctx) => {
    try {
      const loadingMsg = await ctx.reply("🚀 Processing your transfer...");

      // For small transfers, set default compliance values
      const amount = parseFloat(quoteRequest.amount || "0") / 1000000;
      if (amount < 120) {
        transferPayload.invoiceNumber = `SMALL-${Date.now()}`;
        transferPayload.purposeCode = "self";
        transferPayload.sourceOfFunds = "savings";
        transferPayload.recipientRelationship = "self";
        transferPayload.customerData = transferPayload.customerData || {};
        transferPayload.customerData.name = token.user.email.split("@")[0];
        transferPayload.customerData.email = token.user.email;
        transferPayload.customerData.country = quoteRequest.sourceCountry;
      }

      const transfer = await axios.post(
        "/api/transfers/offramp",
        transferPayload,
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      await ctx.deleteMessage(loadingMsg.message_id);

      const transferDetails = `
💸 *Transfer Successful!*

*ID:* \`${transfer.data.id}\`
*Amount:* ${amount} USDC
*Status:* ${transfer.data.status}
*Fee:* ${transfer.data.feeAmount} ${transfer.data.feeCurrency}

💰 *Recipient Will Receive:* 
${transfer.data.destinationAmount} ${transfer.data.destinationCurrency}

⏱️ *Estimated Arrival:* 
${transfer.data.estimatedArrival || "1-3 business days"}

📋 *Tracking:* 
${transfer.data.trackingUrl || "Available in your dashboard"}
            `;

      await ctx.replyWithMarkdown(transferDetails, {
        reply_markup: transfer.data.trackingUrl
          ? {
              inline_keyboard: [
                [{ text: "Track Transfer", url: transfer.data.trackingUrl }],
              ],
            }
          : undefined,
      });
    } catch (error) {
      console.error("Transfer failed:", error);

      let errorMessage = "Transfer failed. Please try again later.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      await ctx.reply(`❌ *Transfer Failed*\n\n${errorMessage}`);
    }
  });

  // Handle edit request
  bot.action("edit_transfer", async (ctx) => {
    await ctx.answerCbQuery();
    currentStep = 0;
    await askNextQuestion(ctx);
  });

  // Handle cancellation
  bot.action("cancel_withdraw", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Transfer cancelled. No action was taken.");
    currentStep = 0;
  });
};

export const transferCallback = async (
  bot: Telegraf<MyContext>,
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>,
  token: UserRedis | null
) => {
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
      [Markup.button.callback("Request Off-Ramp", "transfer_offramp")],
      [Markup.button.callback("Cancel", "cancel_transfer")],
    ])
  );

  // Handle wallet transfer
  bot.action("transfer_wallet", async (ctx) =>
    transferWalletCallback(bot, ctx, token)
  );

  // Handle email transfer (unchanged)
  bot.action("transfer_email", async (ctx) =>
    transferEmailCallback(bot, ctx, token)
  );

  // Handle off-ramp transfer (unchanged)
  bot.action("transfer_offramp", async (ctx) =>
    transferOffRampCallback(bot, ctx, token)
  );

  // Handle cancellation
  bot.action("cancel_transfer", (ctx) => {
    // Reset the transfer process flag
    ctx.session!.isTransferProcessActive = false;

    ctx.reply("Transfer canceled.");
  });
};

export const depositCallback = async (
  bot: Telegraf<MyContext>,
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>
) => {
  // Initialize the deposit state
  let depositState: {
    chainId: number;
    amount: string;
    sourceOfFunds: string;
  } = {} as any;

  // Prompt the user to enter the deposit amount
  await ctx.reply("Please enter the amount you want to deposit:");

  // Handle amount input and chain selection
  bot.on("text", async (ctx) => {
    const text = ctx.message.text;

    // Step 1: Handle amount input
    if (!depositState.amount) {
      const amount = text.trim();

      // Validate amount
      if (isNaN(parseFloat(amount))) {
        return ctx.reply("Invalid amount. Please enter a valid number.");
      }

      // Save the amount in the session
      depositState.amount = amount;

      // Prompt the user to select a chain
      await ctx.reply(
        "Select the chain:",
        Markup.inlineKeyboard(
          chains.map((chain) => [
            Markup.button.callback(chain.name, `select_chain_${chain.id}`),
          ])
        )
      );
    }

    // Step 2: Handle source of funds input
    else if (!depositState.sourceOfFunds) {
      const sourceOfFunds = text.trim().toLowerCase();

      // Validate source of funds
      if (!validSourceOfFunds.includes(sourceOfFunds as SourceOfFunds)) {
        return ctx.reply(
          `Invalid source of funds. Supported values: ${validSourceOfFunds.join(
            ", "
          )}`
        );
      }

      // Save the source of funds in the session
      depositState.sourceOfFunds = sourceOfFunds;

      // Confirm the deposit details
      await ctx.reply(
        `You are about to deposit ${depositState.amount} USD on ${
          chains.find((chain) => chain.id === depositState.chainId)?.name
        } (Chain ID: ${depositState.chainId}) with source of funds: ${
          depositState.sourceOfFunds
        }.\n\nAre you sure?`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Yes", "confirm_deposit")],
          [Markup.button.callback("No", "cancel_deposit")],
        ])
      );
    }
  });

  // Handle chain selection
  bot.action(/select_chain_(.+)/, async (ctx) => {
    const chainId = parseInt(ctx.match[1]); // Extract chain ID from the callback data

    // Save the chain ID in the session
    depositState.chainId = chainId;

    // Prompt the user to enter the source of funds
    await ctx.reply(
      "Please enter the source of funds (e.g., savings, salary):"
    );
  });

  // Handle deposit confirmation
  bot.action("confirm_deposit", async (ctx) => {
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      // Construct the payload
      const payload = {
        amount: formatAmount(depositState.amount),
        sourceOfFunds: depositState.sourceOfFunds,
        depositChainId: depositState.chainId,
      };

      // Initiate the deposit
      const deposit = await depositFunds(
        token.accessToken,
        payload as unknown as depositFundsPayload
      );

      // Format the deposit details
      const depositDetails = `
            ✅ **Deposit Initiated Successfully!**
        
            **Deposit ID**: \`${deposit.id}\`
            **Status**: ${deposit.status}
            **Amount**: ${Number(deposit.amount) / 100_000_000} ${
        deposit.currency
      }
            **Chain ID**: ${depositState.chainId}
        
            **Source Account**:
            - **Type**: ${deposit.sourceAccount.type}
            - **Wallet Address**: \`${deposit.sourceAccount.walletAddress}\`
            - **Network**: ${deposit.sourceAccount.network}
        
            **Destination Account**:
            - **Type**: ${deposit.destinationAccount.type}
            - **Wallet Address**: \`${
              deposit.destinationAccount.walletAddress
            }\`
            - **Network**: ${deposit.destinationAccount.network}
        
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
                url: deposit.transactions[0].depositUrl,
              },
            ],
          ],
        },
      });

      // Reset the deposit state
      depositState = { chainId: 0, amount: "", sourceOfFunds: "" };
    } catch (error) {
      console.error("Deposit error:", error);
      await ctx.reply("Failed to initiate deposit. Please try again.");
      depositState = { chainId: 0, amount: "", sourceOfFunds: "" }; // Reset the deposit state
    }
  });

  // Handle deposit cancellation
  bot.action("cancel_deposit", (ctx) => {
    ctx.reply("Deposit canceled.");
    depositState = { chainId: 0, amount: "", sourceOfFunds: "" }; // Reset the deposit state
  });
};

export const receiveCallback = async (
  bot: Telegraf<MyContext>,
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>
) => {
  if (!ctx.from) return ctx.reply("Invalid user."); // Handle undefined 'from'
  const userId = ctx.from.id.toString();
  try {
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    const wallet = await getWalletDefault(token.accessToken);

    if (!wallet) {
      return ctx.reply("No default wallet found.");
    }

    const networkName =
      chains.find((el) => el.id.toString() === wallet.network)?.name ||
      "unknown";

    const formattedBalances = `*Your Wallet*\n🌐 *Network*: ${networkName}\n🔗 *Address*: ${
      wallet.walletAddress || "unknown"
    }\n🪪 Wallet ID: ${wallet.id || "unknown"}`;

    await ctx.reply(escapeMarkdownV2(formattedBalances), {
      parse_mode: "MarkdownV2",
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "Get QR Code",
            `get_qr_${wallet.walletAddress}`
          ),
        ],
      ]).reply_markup,
    });
  } catch (error) {
    console.error("Error fetching wallet details:", error);
    await ctx.reply("Failed to fetch wallet details. Please try again.");
  }

  // Handle QR code generation
  bot.action(/get_qr_(.+)/, async (ctx) => {
    const walletAddress = ctx.match[1]; // Extract wallet address from the callback data
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      const wallet = await getWalletDefault(token.accessToken);

      if (!wallet) {
        return ctx.reply("No default wallet found.");
      }

      // Generate QR code for the wallet address
      const qrCode = await QRCode.toBuffer(walletAddress, {
        errorCorrectionLevel: "H",
        type: "png",
        width: 400,
        margin: 2,
      });

      const networkName =
        chains.find((el) => el.id.toString() === wallet.network)?.name ||
        "unknown";

      // Create caption with wallet address
      const caption =
        `📥 **Deposit Address**\n\n` +
        `Network: ${networkName}\n` +
        `Address: \`${walletAddress}\`\n\n` +
        `Scan the QR code or copy the address above to send funds`;

      // Send QR code and address to the user
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
      console.error("Error generating QR code:", error);
      await ctx.reply("Failed to generate QR code. Please try again.");
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
};

export const profileCallback = async (
  bot: Telegraf<MyContext>,
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>
) => {
  try {
    if (!ctx.from) return ctx.reply("Invalid user."); // Handle undefined 'from'

    const userId = ctx.from.id.toString();
    const userToken = await getUserData(userId);

    if (!userToken) {
      return ctx.reply("You need to login first. Use /login command.");
    }

    // Show loading message
    const loadingMsg = await ctx.reply("Fetching your profile...");

    // Get profile data
    const profile = await AuthService.getProfile(userToken.accessToken);

    // Format profile information
    const profileText = `
👤 Profile Information

🆔 ID: ${profile.id}
📧 Email: ${profile.email}
👥 Name: ${profile.firstName + " " + profile.lastName || "Not set"} ${
      profile.lastName || ""
    }
🏢 Organization: ${profile.organizationId}
🎭 Role: ${profile.role.toUpperCase()}
🔒 Status: ${profile.status.toUpperCase()}
📇 Type: ${profile.type.toUpperCase()}

💼 Wallet Details
├─ 🏷️ Type: ${profile.walletAccountType.toUpperCase()}
├─ 🏦 Address: \`${profile.walletAddress}\`
└─ 🆔 Wallet ID: ${profile.walletId}

🚀 Relayer Address: \`${profile.relayerAddress}\`
${
  profile.flags?.length
    ? `🏷️ Flags: ${profile.flags
        .map((el) => el.replace("_", " ").toUpperCase())
        .join(", ")}`
    : ""
}
      `.trim();

    // Delete loading message
    await ctx.deleteMessage(loadingMsg.message_id);

    // Send profile with menu button
    await ctx.reply(
      profileText,
      Markup.inlineKeyboard([
        Markup.button.url(
          "🖼️ View Profile Image",
          profile.profileImage ||
            "https://github.com/user-attachments/assets/f323d2ec-7c14-44ba-89ee-bcdc4515a182"
        ),
        Markup.button.callback("🔄 Refresh", "refresh_profile"),
      ])
    );

    // Handle refresh button
    bot.action("refresh_profile", async (ctx) => {
      await ctx.answerCbQuery("Refreshing profile...");
      await ctx.deleteMessage();
      await profileCallback(bot, ctx);
    });
  } catch (error) {
    console.error("Profile error:", error);
    ctx.reply("Failed to fetch profile. Please try again later.");
  }
};
