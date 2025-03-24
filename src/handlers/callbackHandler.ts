import { CallbackQuery, Update } from "telegraf/typings/core/types/typegram";
import { getUserData, UserRedis } from "../libs/redis";
import {
  chains,
  escapeMarkdownV2,
  formatBalances,
  getWalletBalances,
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
  PurposeCode,
  RecipientRelationship,
  SourceOfFunds,
} from "../types/transactions";

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
    "`/login <email>` - Log in with your email.\n" +
    "`/verify <otp>` - Verify your OTP to complete login.\n\n" +
    "💼 *Wallet Management*\n" +
    "`/balance` - Check your wallet balances.\n" +
    "`/wallets` - View your wallet details.\n" +
    "`/wallet def <address>` - Set a default wallet.\n" +
    "`/receive` - Get your wallet address and QR code.\n\n" +
    "💸 *Transfers*\n" +
    "`/send <email> <amount>` - Send funds to an email.\n" +
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
  token: UserRedis
) => {
  // Set the transfer process flag to true
  ctx.session!.isTransferProcessActive = true;

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
  token: UserRedis
) => {
  // Set the transfer process flag to true
  ctx.session!.isTransferProcessActive = true;

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
  token: UserRedis
) => {
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
      await ctx.reply("Please provide the customer's business name (if any):");
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
};

export const transferCallback = async (
  bot: Telegraf<MyContext>,
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>,
  token: UserRedis
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
