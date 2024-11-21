import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getWalletAddress, getWalletBalance, resolveEns, reverseResolveAddress, sendTokens } from "./wallet";

require("dotenv").config({ path: ".env" });


const openai = new OpenAI({apiKey: process.env.OPENAI_KEY});

const prompt: ChatCompletionMessageParam = {
  role: "system",
  content: `You are an AI Wallet managing user wallets on EVM Chains - specifically Ethereum Sepolia (testnet), Ethereum Mainnet.
   You have functions you can call - 
   only use the provided functions. When explaining the output of these functions to the user, provide detail and context. Be friendly 
   towards the user and help them out in whatever way possible. Provide context on the functions you called and the arguments that were 
   passed to explain to the user how you got the result you did.`,
};

const functions = [
  {
    name: "get_wallet_address",
    description:
      "Get the wallet address of the current user. This returns the wallet address of the user that is currently using the AI Wallet.",
    parameters: {

    },
  },
  {
    name: "get_wallet_balance",
    description:
      "Get someone's balance. This returns the balance of either the user that is currently using the AI Wallet or of the owner of the wallet address that the user specifies, across all the different chains and networks.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Someone else's wallet address",
        },
      },
      required: [],
    },

  },

  {
    name: "resolve_ens",
    description:
      "Take someone's ENS identifier like 'alice.eth' as input and return only the address of the wallet that is linked to it.",
    parameters: {
      type: "object",
      properties: {
        ensName: {
          type: "string",
          description: "Someone's ENS identifier",
        },
      },
      required: ["ensName"],
    },

  },
  {
    name: "reverse_resolve_address",
    description:
      "Take either the user's or someone else's wallet address and get the ENS identifier (eg. alice.eth) linked to it.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Someone else's wallet address",
        },
      },
      required: [],
    },

  },
  {
    name: "send_tokens",
    description:
      "Send tokens from the user's wallet to someone else's wallet. This function takes the recipient's wallet address / ens name, the amount of tokens to send, the chain, the network (testnet or mainnet) as input.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Someone else's wallet address or ENS name",
        },
        amountInEthOrMatic: {
          type: "string",
          description: "Amount of tokens to send",
        },
        chain: {
          type: "string",
          description: "Chain to send tokens on, either 'ethereum' or 'polygon' ",
        },
        network: {
          type: "string",
          description: "Network to send tokens on (either testnet or mainnet)",
        },
      },
      required: ["to", " amountInEthOrMatic", "chain", "network"],
    },

  }








];



export async function getChatCompletion(
  telegramUserId: string,
  message: string
) {
  console.log("getting chat completion")
  const messages: ChatCompletionMessageParam[] = [
    prompt,
    {
      role: "user",
      content: message,
    },
  ];
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    functions,
    function_call: "auto",
    
  });


  console.log("response is here:", response)

  const responseMsg = response.choices[0].message;
  console.log({ responseMsg });

  let finalResponse = "Sorry, I couldn't figure this out.";

  if (!responseMsg.function_call) {
    finalResponse = responseMsg.content ?? finalResponse;
  }

  if (responseMsg.function_call) {
    const functionName = responseMsg.function_call.name;
    // @ts-ignore
    const fn = functionMap[functionName];
    const args = JSON.parse(responseMsg.function_call.arguments);
    args.telegramUserId = telegramUserId;

    console.log({
      fn,
      args,
    });

    let fnRes = "";
    try {
      fnRes = await fn(args);
    } catch (error) {
      console.error(error);
      fnRes = error instanceof Error ? error.message : `${error}`;
    }

    messages.push(responseMsg);
    messages.push({
      role: "function",
      name: functionName,
      content: fnRes,
    });

    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
    });

    const secondResponseMsg = secondResponse.choices[0].message;

    finalResponse = secondResponseMsg.content ?? finalResponse;
  }

  return finalResponse;
}

const functionMap = {
  get_wallet_address: getWalletAddress,
  get_wallet_balance: getWalletBalance,
  resolve_ens: resolveEns,
  reverse_resolve_address: reverseResolveAddress,
  send_tokens: sendTokens

};