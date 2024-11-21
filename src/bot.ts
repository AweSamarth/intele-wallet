import { Composer, Context, Markup, Scenes, Telegraf, session } from "telegraf";
import { getChatCompletion } from "./ai";
import { encryptData, decryptData } from "./cryptography";

import { prisma } from "./db";
import { generateNewWallet, getWalletFromTelegramUserId, loadWallet } from "./wallet";

interface BotContext extends Context {
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}

export class AIWalletBot {
  private _bot: Telegraf<BotContext>;
  constructor() {
    this._bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_KEY as string);

    process.once("SIGINT", () => this._bot.stop("SIGINT"));
    process.once("SIGTERM", () => this._bot.stop("SIGTERM"));
  }

  public async start() {
    this.registerCommands();
    await this._bot.launch();
  }

  private registerCommands() {
    const helpMessage = `🤖 Intele-Wallet: Your AI Crypto Assistant

Here's what I can help you with:

💰 Balance - "What's my balance?" or "What is the balnce of 0xdofjlkn....?"
📤 Send Tokens - "Send 0.1 ETH to 0x..." or "Transfer 1 ETH to 0xfkdlja..." 
📋 Address - "Show my wallet address"
🔍 ENS - "Resolve vitalik.eth" or "Get address for ENS name"
↩️ Reverse ENS - "Get ENS for 0x..." or "What's the ENS name for this address?"

Just ask naturally and I'll help you out! Type /help to receive this message again.`;
    const stepHandler = new Composer<BotContext>();

    stepHandler.action("create_wallet", async (ctx) => {
      const newWallet = await generateNewWallet();
      const encryptedPrivateKey = await encryptData(newWallet.privateKey);

      await prisma.wallet.create({
        data: {
          telegramUserId: ctx.chat!.id.toString(),
          encryptedPrivateKey,
        },
      });



      await ctx.answerCbQuery();
      await ctx.reply("Your wallet has been created! 🎉");
      await ctx.reply(helpMessage);


      return ctx.scene.leave();
    });

    stepHandler.action("import_wallet", async (ctx) => {
      await ctx.reply(
        `Please send me the private key of the wallet you would like to import.`,
        Markup.forceReply()
      );

      return ctx.wizard.next();
    });

    const createOrImportWalletWizard = new Scenes.WizardScene
      (
        "create_or_import_wallet",
        async (ctx) => {
          const userExists = await prisma.wallet.findUnique({
            where: {
              telegramUserId: ctx.message!.chat.id.toString(),
            },
          });

          if (userExists) {


            await ctx.reply(
              `Welcome back to Wall-Et 🤖! How can I help you today?`
            );
            await ctx.reply(helpMessage);

            return ctx.scene.leave();
          }

          await ctx.reply(
            `Would you like to create a new wallet or import one using the private key?`,
            Markup.inlineKeyboard([
              Markup.button.callback("Create New Wallet", "create_wallet"),
              Markup.button.callback("Import Wallet", "import_wallet"),
            ])
          );

          return ctx.wizard.next();
        },
        stepHandler,
        async (ctx) => {
          // @ts-ignore
          const message = ctx.message!.text;
          try {
            const wallet = await loadWallet(message);
            const encryptedPrivateKey = await encryptData(wallet.privateKey);

            await prisma.wallet.create({
              data: {
                telegramUserId: ctx.chat!.id.toString(),
                encryptedPrivateKey,
              },
            });



            await ctx.reply(
              "Your wallet has been imported! 🎉 How may I help you?"
              
            )
            await ctx.reply(helpMessage);
            ;
          } catch (error) {
            await ctx.reply(
              "Sorry, I couldn't import the wallet. Please try again."
            );

            ctx.scene.reset();
            return ctx.scene.enter("create_or_import_wallet");
          }

          return ctx.scene.leave();
        }
      );

    const stage = new Scenes.Stage<BotContext>([createOrImportWalletWizard]);

    this._bot.use(session());
    this._bot.use(stage.middleware());
    this._bot.command('help', async (ctx) => {
      await ctx.reply(helpMessage);
    });
    this._bot.start(async (ctx) => {
      await ctx.scene.enter("create_or_import_wallet");
    });


    this._bot.on("message", async (ctx) => {
      const telegramUserId = ctx.chat!.id.toString();

      try {
        await getWalletFromTelegramUserId(telegramUserId);

        // @ts-ignore
        if (ctx.message!.text) {
          await ctx.reply("Processing...");
          const completion = await getChatCompletion(
            ctx.chat!.id.toString(),
            // @ts-ignore
            ctx.message!.text!
          );

          await ctx.reply(completion);
        }
      } catch (error) {
        await ctx.scene.enter("create_or_import_wallet");
      }
    });
  }
}
