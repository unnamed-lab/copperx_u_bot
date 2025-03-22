import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import {
  depositFunds,
  depositFundsPayload,
  formatAmount,
  SourceOfFunds,
  validSourceOfFunds,
} from "../libs/funds";
import { getUserData } from "../libs/redis";

const chains = [
  { id: 137, name: "Polygon" },
  { id: 42161, name: "Arbitrum" },
  { id: 8453, name: "Base" },
  { id: 23434, name: "Starknet" },
];

export const depositCommand = async (bot: Telegraf<MyContext>) => {
  // Handle the /deposit command to initiate a deposit

  // Command to initiate the deposit process
  bot.command("deposit", async (ctx) => {
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
  });
};
