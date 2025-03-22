import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import {
  chunkCurrencies,
  chunkPurposeCodes,
  Country,
  CreateOfframpTransferDto,
  createPaginationKeyboard,
  CreateSendTransferDto,
  CreateWalletWithdrawTransferDto,
  currencies,
  Currency,
  fetchTransfers,
  formatAmount,
  formatTransfersMessage,
  getAllPayee,
  getPayee,
  PurposeCode,
  purposeCodes,
  RecipientRelationship,
  SourceOfFunds,
  validCountries,
  validPurposeCodes,
  validRecipientRelationships,
  validSourceOfFunds,
  withdrawFunds,
  withdrawFundsEmail,
  withdrawFundsWallet,
} from "../libs/funds";
import { getUserData } from "../libs/redis";
import { escapeMarkdownV2 } from "../libs/utils";

export const transferCommand = async (bot: Telegraf<MyContext>) => {
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
        [Markup.button.callback("Request Off-Ramp", "transfer_offramp")],
        [Markup.button.callback("Cancel", "cancel_transfer")],
      ])
    );

    // Handle wallet transfer
    bot.action("transfer_wallet", async (ctx) => {
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
              ...chunkCurrencies(currencies, 3).map((chunk) =>
                chunk.map((currency) =>
                  Markup.button.callback(currency, `currency_${currency}`)
                )
              ),
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
            ...chunkCurrencies(currencies, 3).map((chunk) =>
              chunk.map((currency) =>
                Markup.button.callback(currency, `currency_${currency}`)
              )
            ),
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
          **Wallet Address**: \`${transfer.destinationAccount.walletAddress}\`
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
            ...chunkCurrencies(currencies, 3).map((chunk) =>
              chunk.map((currency) =>
                Markup.button.callback(currency, `currency_${currency}`)
              )
            ),
            [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
            [Markup.button.callback("❌ Cancel", "cancel_transfer")],
          ])
        );
      });
    });

    // Handle email transfer (unchanged)
    bot.action("transfer_email", async (ctx) => {
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
        payeeButtons.push([
          Markup.button.callback("❌ Cancel", "cancel_transfer"),
        ]);

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
                return ctx.reply(
                  "❌ Invalid amount. Please enter a valid number."
                );
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
                  ...chunkCurrencies(currencies, 3).map((chunk) =>
                    chunk.map((currency) =>
                      Markup.button.callback(currency, `currency_${currency}`)
                    )
                  ),
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
                ...chunkCurrencies(currencies, 3).map((chunk) =>
                  chunk.map((currency) =>
                    Markup.button.callback(currency, `currency_${currency}`)
                  )
                ),
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
                [
                  Markup.button.callback(
                    "✅ Confirm",
                    "confirm_email_transfer"
                  ),
                ],
                [Markup.button.callback("⬅️ Back", "back_to_currency")],
                [Markup.button.callback("❌ Cancel", "cancel_transfer")],
              ])
            );
          });

          // Handle transfer confirmation
          bot.action("confirm_email_transfer", async (ctx) => {
            try {
              console.log("Payload", transferPayload);
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
          return ctx.reply(
            "❌ Failed to fetch payee details. Please try again."
          );
        }
      });
    });

    // Handle off-ramp transfer (unchanged)
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
              `Customer Business Name: ${
                payload.customerData!.businessName
              }\n` +
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
};
