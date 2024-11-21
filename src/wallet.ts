import { AddressLike, BigNumberish, Wallet } from "ethers";
import { decryptData, encryptData } from "./cryptography";
import { prisma } from "./db";
import { SUPPORTED_CHAINS } from "./chains";
import { ethers, formatEther } from "ethers";
import { SupportedChain } from "./chains";

export const generateNewWallet = async () => {
  return Wallet.createRandom();
};

export async function loadWallet(privateKey: string) {
  return new Wallet(privateKey);
}



export const getWalletAddress = async ({
  telegramUserId,
}: {
  telegramUserId: string;
}) => {
  const wallet = await getWalletFromTelegramUserId(telegramUserId);
  return wallet.address;
};

export const getWalletBalance = async ({
  telegramUserId,
  address,
}: {
  telegramUserId: string;
  address?: AddressLike;
}) => {
  const balancesData: string[] = [];

  for (const chain of Object.keys(SUPPORTED_CHAINS)) {
    for (const network of Object.keys(
      SUPPORTED_CHAINS[chain as SupportedChain]
    )) {


      const chainInfo =
        SUPPORTED_CHAINS[chain as SupportedChain][
          network as "testnet" | "mainnet"
        ];

        console.log("chain info is here:", chainInfo)
      const provider = new ethers.JsonRpcProvider(chainInfo.rpcUrl);
      let balance: BigNumberish;  
      if (address) {
        balance = await provider.getBalance(address);
      } else {
        console.log("getting wallet from telegram user id")
        const wallet = await getWalletFromTelegramUserId(telegramUserId);
        const connectedWallet = wallet.connect(provider);
        console.log("connected wallet address is: ", connectedWallet.address)
        balance = await provider.getBalance(connectedWallet.address);
      }
      const humanReadableBalance = formatEther(balance);

      balancesData.push(
        `${chainInfo.name}: ${humanReadableBalance} ${chainInfo.tokenName}`
      );
    }

    balancesData.push("");
  }

  return balancesData.join("\n");
};

export const getWalletFromTelegramUserId = async (
  telegramUserId: string,
  opts?: {
    chain: SupportedChain;
    network: "mainnet" | "testnet";
  }
) => {
  console.log("getting wallet");
  const wallet = await prisma.wallet.findUnique({
    where: {
      telegramUserId,
    },
  });

  if (!wallet) {
    console.log("no wallet found");
    throw new Error("Wallet not found");
  }

  const decryptedPrivateKey = await decryptData(wallet.encryptedPrivateKey);
  const signer = new Wallet(decryptedPrivateKey);

  if (opts) {
    const rpcUrl = SUPPORTED_CHAINS[opts.chain][opts.network].rpcUrl;
    return signer.connect(new ethers.JsonRpcProvider(rpcUrl));
  }

  return signer;
};

export const resolveEns = async ({telegramUserId, ensName}: {
  telegramUserId: string;
  ensName?: string;
}) => {
  const provider = new ethers.JsonRpcProvider(
    SUPPORTED_CHAINS["ethereum"]["mainnet"].rpcUrl
  );


  const address = await provider.resolveName(ensName);

  return address;
};


export const reverseResolveAddress = async ({telegramUserId, address}: {telegramUserId: string; address?: string}) => {



  const provider = new ethers.JsonRpcProvider(
    SUPPORTED_CHAINS["ethereum"]["mainnet"].rpcUrl
  );
  let name:string
  if(address){
  name = await provider.lookupAddress(address);
  }
  else{
    const wallet = await getWalletFromTelegramUserId(telegramUserId);
    name = await provider.lookupAddress(wallet.address);
  }
  if(name){

    return name;
  }

  else return "No ENS name found"


}

export const sendTokens = async ({ telegramUserId, to,  amountInEthOrMatic, chain, network }: { telegramUserId: string; to: string; amountInEthOrMatic: string; chain: SupportedChain; network:"testnet" | "mainnet"  }) => {
  const wallet = await getWalletFromTelegramUserId(telegramUserId);


  const provider = new ethers.JsonRpcProvider(
    SUPPORTED_CHAINS[chain.toLowerCase()][network.toLowerCase()].rpcUrl
  );


  //if to ends with .eth, resolve it to an address
  if(to.endsWith(".eth")){
    to = await provider.resolveName(to);
  }


  const signer = wallet.connect(provider);
    
  const tx = await signer.sendTransaction({
    to,
    value: ethers.parseUnits(amountInEthOrMatic),
  });


  return tx.hash;
}