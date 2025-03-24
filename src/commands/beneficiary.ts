import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import {
  createPayee,
  deletePayee,
  getAllPayee,
  getPayee,
  updatePayee,
  validCountries,
} from "../libs/funds";
import { getUserData } from "../libs/redis";
import { escapeMarkdownV2, validateEmail } from "../libs/utils";
import { Country, CreatePayeeDto, UpdatePayeeDto } from "../types/transactions";

export const beneficiaryCommand = async (bot: Telegraf<MyContext>) => {
  // Define the beneficiary command

  // Handle the /beneficiaries command to fetch and display saved beneficiaries
  bot.command("beneficiaries", async (ctx) => {
    const userId = ctx.from.id.toString(); // Get user ID
    const token = await getUserData(userId); // Fetch user data

    if (!token) {
      return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
    }

    try {
      const payees = await getAllPayee(token.accessToken); // Fetch all beneficiaries

      if (payees.length === 0 && !!Array.isArray(payees)) {
        return ctx.reply("No beneficiaries found."); // Handle no beneficiaries found
      }

      let message = "📋 *Beneficiaries*\n\n"; // Initialize message
      payees.forEach((payee) => {
        message +=
          `- 🆔 ID: ${payee.id}\n` +
          `- 😊 Name: ${payee.displayName}\n` +
          `- 📛 Nickname: ${payee.nickName}\n` +
          `- ☎️ Phone Number: ${payee.phoneNumber}\n` +
          `- 📧 Email: ${payee.email}\n` +
          `- 🏦 Has Bank: ${payee.hasBankAccount ? "✅" : "❌"}\n\n`; // Format beneficiary details
      });

      await ctx.reply(escapeMarkdownV2(message), { parse_mode: "MarkdownV2" }); // Send formatted message
    } catch (error) {
      console.error("Error fetching beneficiaries:", error); // Log errors
      await ctx.reply("❌ Failed to fetch beneficiaries. Please try again."); // Notify user of failure
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
        `- 🆔 ID: ${payee.id}\n` +
        `- 😊 Name: ${payee.displayName}\n` +
        `- 1️⃣ First Name: ${payee.firstName}\n` +
        `- 2️⃣ Last Name: ${payee.lastName}\n` +
        `- 📛 Nickname: ${payee.nickName}\n` +
        `- 📧 Email: ${payee.email}\n` +
        `- 📞 Phone: ${payee.phoneNumber || "N/A"}\n` +
        `- 🏦 Bank: ${
          payee.bankAccount ? payee.bankAccount?.bankName : "N/A"
        }\n` +
        `- 🌍 Country: ${
          payee.bankAccount ? payee.bankAccount.country : "N/A"
        }\n`;

      await ctx.reply(escapeMarkdownV2(message), { parse_mode: "MarkdownV2" });
    } catch (error) {
      console.error("Error fetching beneficiary details:", error);
      await ctx.reply(
        "❌ Failed to fetch beneficiary details. Please try again."
      );
    }
  });

  // Handle the /addBeneficiary command to add a new beneficiary
  bot.command("addBeneficiary", async (ctx) => {
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    let activeProcess = true;

    // Initialize the state for the user
    let addBeneficiaryState: CreatePayeeDto = {} as any;

    if (!addBeneficiaryState.bankAccount) {
      addBeneficiaryState.bankAccount = {} as any;
    }

    // Start the process by asking for the nickname
    await ctx.reply(
      "Let's add a new beneficiary! 🎉\n\nPlease provide the beneficiary's nickname:",
      Markup.inlineKeyboard([
        Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
      ])
    );

    bot.on("text", async (ctx) => {
      const text = ctx.message.text;

      if (text.startsWith("/")) {
        return; // Ignore commands
      }

      if (activeProcess) {
        if (!addBeneficiaryState.nickName) {
          addBeneficiaryState.nickName = text;

          await ctx.reply(
            "Great! Now, please provide the beneficiary's first name:",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.firstName) {
          addBeneficiaryState.firstName = text;

          await ctx.reply(
            "Got it! Now, please provide the beneficiary's last name:",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.lastName) {
          addBeneficiaryState.lastName = text;

          await ctx.reply(
            "Awesome! Now, please provide the beneficiary's email:",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.email) {
          if (!validateEmail(text)) {
            return await ctx.reply(
              "It seems the email you provided was an invalid email format. Please try again."
            );
          } else {
            addBeneficiaryState.email = text;
            await ctx.reply(
              "Got it! Now, please provide the beneficiary's phone number (with country code, e.g., 1234567890):",
              Markup.inlineKeyboard([
                Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
              ])
            );
            return;
          }
        }

        if (!addBeneficiaryState.phoneNumber) {
          addBeneficiaryState.phoneNumber = text;

          await ctx.reply(
            "Awesome! Now, let's collect the bank account details.\n\nPlease provide the bank's country (e.g., usa, ind):",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.bankAccount.country) {
          // Validate the country
          if (!validCountries.includes(text.toLowerCase() as Country)) {
            return ctx.reply(
              `Invalid country. Supported values: ${validCountries
                .map((el) => el.toUpperCase())
                .join(", ")}`
            );
          }
          addBeneficiaryState.bankAccount.country =
            text.toLowerCase() as Country;

          await ctx.reply(
            "Great! Now, please provide the bank's name:",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.bankAccount.bankName) {
          addBeneficiaryState.bankAccount!.bankName = text;

          await ctx.reply(
            "Awesome! Now, please select the bank account type:",
            Markup.inlineKeyboard([
              [Markup.button.callback("Savings", "account_type_savings")],
              [Markup.button.callback("Checking", "account_type_checking")],
              [Markup.button.callback("❌ Cancel", "cancel_add_beneficiary")],
            ])
          );
          return;
        }

        if (!addBeneficiaryState.bankAccount.bankAccountType) {
          return;
        }

        if (!addBeneficiaryState.bankAccount.bankAddress) {
          addBeneficiaryState.bankAccount!.bankAddress = text;

          // Display buttons for bankAccountType
          await ctx.reply(
            "Awesome! Now, please select the bank account type:",
            Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "WEB3 WALLET",
                  "account_type_web3_wallet"
                ),
                Markup.button.callback("BANK ACH", "account_type_bank_ach"),
              ],
              [
                Markup.button.callback(
                  "BANK ACH PUSH",
                  "account_type_bank_ach_push"
                ),
                Markup.button.callback("BANK WIRE", "account_type_bank_wire"),
              ],
              [
                Markup.button.callback(
                  "BANK TRANSFER",
                  "account_type_bank_transfer"
                ),
                Markup.button.callback("BANK IFSC", "account_type_bank_ifsc"),
              ],
              [Markup.button.callback("BANK IBAN", "account_type_bank_iban")],
              [Markup.button.callback("❌ Cancel", "cancel_add_beneficiary")],
            ])
          );
          return;
        }

        if (!addBeneficiaryState.bankAccount.type) {
          // This will be handled by the button callbacks
          return;
        }

        if (!addBeneficiaryState.bankAccount.bankAccountNumber) {
          addBeneficiaryState.bankAccount!.bankAccountNumber = text;

          await ctx.reply(
            "Great! Now, please provide the bank routing number:",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.bankAccount.bankRoutingNumber) {
          // Validate routing number length (e.g., 9 digits for USA)
          if (
            addBeneficiaryState.bankAccount.country === "usa" &&
            text.length !== 9
          ) {
            return ctx.reply(
              "Invalid routing number. It must be 9 digits for USA."
            );
          }
          addBeneficiaryState.bankAccount!.bankRoutingNumber = text;

          await ctx.reply(
            "Almost done! Now, please provide the beneficiary's full name as it appears on the bank account:",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.bankAccount.bankBeneficiaryName) {
          addBeneficiaryState.bankAccount!.bankBeneficiaryName = text;

          await ctx.reply(
            "Almost there! Please provide the beneficiary's address (with pin code):",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.bankAccount.bankBeneficiaryAddress) {
          addBeneficiaryState.bankAccount!.bankBeneficiaryAddress = text;

          await ctx.reply(
            "Last step! Please provide the bank swift code:",
            Markup.inlineKeyboard([
              Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
            ])
          );
          return;
        }

        if (!addBeneficiaryState.bankAccount.swiftCode) {
          addBeneficiaryState.bankAccount!.swiftCode = text;

          // Confirm all details
          const payload = addBeneficiaryState as CreatePayeeDto;

          await ctx.reply(
            `✅ Here are the details you provided:\n\n` +
              `- Nickname: ${payload.nickName}\n` +
              `- First Name: ${payload.firstName}\n` +
              `- Last Name: ${payload.lastName}\n` +
              `- Email: ${payload.email}\n` +
              `- Phone: ${payload.phoneNumber}\n` +
              `- Bank Country: ${payload.bankAccount.country}\n` +
              `- Bank Name: ${payload.bankAccount.bankName}\n` +
              `- Bank Address: ${payload.bankAccount.bankAddress}\n` +
              `- Bank Account Type: ${payload.bankAccount.bankAccountType}\n` +
              `- Account Type: ${payload.bankAccount.type
                .replace("_", " ")
                .toUpperCase()}\n` +
              `- Account Number: ${payload.bankAccount.bankAccountNumber}\n` +
              `- Routing Number: ${payload.bankAccount.bankRoutingNumber}\n` +
              `- Beneficiary Name: ${payload.bankAccount.bankBeneficiaryName}\n` +
              `- Beneficiary Address: ${payload.bankAccount.bankBeneficiaryAddress}\n\n` +
              `Are you sure you want to add this beneficiary?`,
            Markup.inlineKeyboard([
              [Markup.button.callback("✅ Confirm", "confirm_add_beneficiary")],
              [Markup.button.callback("❌ Cancel", "cancel_add_beneficiary")],
            ])
          );
        }
      }
      return;
    });

    // Handle type selection
    bot.action("account_type_savings", async (ctx) => {
      addBeneficiaryState.bankAccount!.bankAccountType = "savings";
      await ctx.reply(
        "Selected Savings account. Type Yes to proceed or click the cancel button to exit the process:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    bot.action("account_type_checking", async (ctx) => {
      addBeneficiaryState.bankAccount!.bankAccountType = "checking";
      await ctx.reply(
        "Selected Checking account. Type Yes to proceed or click the cancel button to exit the process:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    // Handle bankAccountType selection
    bot.action("account_type_web3_wallet", async (ctx) => {
      addBeneficiaryState.bankAccount!.type = "web3_wallet";
      await ctx.reply(
        "Selected WEB3 WALLET. Now, please provide the bank account number:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    bot.action("account_type_bank_ach", async (ctx) => {
      addBeneficiaryState.bankAccount!.type = "bank_ach";
      await ctx.reply(
        "Selected BANK ACH. Now, please provide the bank account number:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    bot.action("account_type_bank_ach_push", async (ctx) => {
      addBeneficiaryState.bankAccount!.type = "bank_ach_push";
      await ctx.reply(
        "Selected BANK ACH PUSH. Now, please provide the bank account number:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    bot.action("account_type_bank_wire", async (ctx) => {
      addBeneficiaryState.bankAccount!.type = "bank_wire";
      await ctx.reply(
        "Selected BANK WIRE. Now, please provide the bank account number:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    bot.action("account_type_bank_transfer", async (ctx) => {
      addBeneficiaryState.bankAccount!.type = "bank_transfer";
      await ctx.reply(
        "Selected BANK TRANSFER. Now, please provide the bank account number:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    bot.action("account_type_bank_ifsc", async (ctx) => {
      addBeneficiaryState.bankAccount!.type = "bank_ifsc";
      await ctx.reply(
        "Selected BANK IFSC. Now, please provide the bank account number:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    bot.action("account_type_bank_iban", async (ctx) => {
      addBeneficiaryState.bankAccount!.type = "bank_iban";
      await ctx.reply(
        "Selected BANK IBAN. Now, please provide the bank account number:",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
        ])
      );
    });

    bot.action("confirm_add_beneficiary", async (ctx) => {
      const payload = addBeneficiaryState as CreatePayeeDto;

      console.log("Payload: ", payload);

      try {
        const payee = await createPayee(token.accessToken, payload);
        await ctx.reply(`✅ Beneficiary added successfully!\nID: ${payee.id}`);
      } catch (error) {
        console.error("Error adding beneficiary:", error);
        await ctx.reply("❌ Failed to add beneficiary. Please try again.");
      }
    });

    // Handle cancellation
    bot.action("cancel_add_beneficiary", async (ctx) => {
      const message = "Process canceled.";
      addBeneficiaryState = {} as any;
      await ctx.reply(message);
      activeProcess = false;
      return;
    });
  });

  // Handle the /updateBeneficiary command to update an existing beneficiary
  bot.command("updateBeneficiary", async (ctx) => {
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    const updateBeneficiaryState: Partial<UpdatePayeeDto> = {};

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    const [id] = ctx.message.text.split(" ").slice(1);
    if (!id) {
      return ctx.reply("Usage: /updateBeneficiary <id>");
    }

    // Start the process by asking for the nickname
    await ctx.reply(
      "Let's update the beneficiary! 🎉\n\nPlease provide the new nickname:",
      Markup.inlineKeyboard([
        Markup.button.callback("❌ Cancel", "cancel_update_beneficiary"),
      ])
    );

    bot.on("text", async (ctx) => {
      const text = ctx.message.text;

      if (!updateBeneficiaryState.nickName) {
        updateBeneficiaryState.nickName = text;
        await ctx.reply(
          "Great! Now, please provide the new first name:",
          Markup.inlineKeyboard([
            Markup.button.callback("❌ Cancel", "cancel_update_beneficiary"),
          ])
        );
        return;
      }

      if (!updateBeneficiaryState.firstName) {
        updateBeneficiaryState.firstName = text;
        await ctx.reply(
          "Got it! Now, please provide the new last name:",
          Markup.inlineKeyboard([
            Markup.button.callback("❌ Cancel", "cancel_update_beneficiary"),
          ])
        );
        return;
      }

      if (!updateBeneficiaryState.lastName) {
        updateBeneficiaryState.lastName = text;
        await ctx.reply(
          "Awesome! Now, please provide the new phone number:",
          Markup.inlineKeyboard([
            Markup.button.callback("❌ Cancel", "cancel_update_beneficiary"),
          ])
        );
        return;
      }

      if (!updateBeneficiaryState.phoneNumber) {
        updateBeneficiaryState.phoneNumber = text
          .replace("+", "")
          .replace(" ", "");

        // Confirm all details
        const payload = updateBeneficiaryState as UpdatePayeeDto;

        await ctx.reply(
          `✅ Here are the details you provided:\n\n` +
            `- Nickname: ${payload.nickName}\n` +
            `- First Name: ${payload.firstName}\n` +
            `- Last Name: ${payload.lastName}\n` +
            `- Phone: ${payload.phoneNumber}\n\n` +
            `Are you sure you want to update this beneficiary?`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "✅ Confirm",
                "confirm_update_beneficiary"
              ),
            ],
            [Markup.button.callback("❌ Cancel", "cancel_update_beneficiary")],
          ])
        );
        return;
      }
    });

    // Handle confirmation
    bot.action("confirm_update_beneficiary", async (ctx) => {
      const userId = ctx.from.id.toString();

      const token = await getUserData(userId);

      if (!token) {
        return ctx.reply("Please log in first using /login.");
      }

      try {
        const payee = await updatePayee(
          token.accessToken,
          id,
          updateBeneficiaryState as UpdatePayeeDto
        );
        await ctx.reply(
          `✅ Beneficiary updated successfully!\nID: ${payee.id}`
        );
      } catch (error) {
        console.error("Error updating beneficiary:", error);
        await ctx.reply("❌ Failed to update beneficiary. Please try again.");
      }
    });

    // Handle cancellation
    bot.action("cancel_update_beneficiary", async (ctx) => {
      const message = "Process canceled.";
      await ctx.reply(message);
    });
  });

  // Handle the /deleteBeneficiary command to delete a beneficiary
  bot.command("deleteBeneficiary", async (ctx) => {
    const userId = ctx.from.id.toString(); // Get user ID
    const token = await getUserData(userId); // Fetch user data

    if (!token) {
      return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
    }

    const [id] = ctx.message.text.split(" ").slice(1); // Extract beneficiary ID
    if (!id) {
      return ctx.reply("Usage: /deleteBeneficiary <id>"); // Handle invalid input
    }

    try {
      const result = await deletePayee(token.accessToken, id); // Delete the beneficiary
      await ctx.reply(`✅ Beneficiary deleted successfully!`); // Notify user of success
    } catch (error) {
      console.error("Error deleting beneficiary:", error); // Log errors
      await ctx.reply("❌ Failed to delete beneficiary. Please try again."); // Notify user of failure
    }
  });
};
