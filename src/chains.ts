export type SupportedChain = "ethereum" | "optimism";

export type ChainInformation = {
  testnet: NetworkInformation;
  mainnet: NetworkInformation;
};

  export type NetworkInformation = {  
  name: string;
  tokenName: string;
  rpcUrl: string;
  chainId: string;
};

export const SUPPORTED_CHAINS: Record<SupportedChain, ChainInformation> = {
  ethereum: {
    testnet: {
      name: "ETH Sepolia",
      tokenName: "ETH",
      rpcUrl: "https://rpc.ankr.com/eth_sepolia",
      chainId: "11155111",
    },
    mainnet: {
      name: "ETH Mainnet",
      tokenName: "ETH",
      rpcUrl: "https://rpc.ankr.com/eth",
      chainId: "1",
    },
  },
  optimism: {
    testnet: {
      name: "Optimism Sepolia",
      tokenName: "ETH",
      rpcUrl: "https://endpoints.omniatech.io/v1/op/sepolia/public",
      chainId: "11155420",
    },
    mainnet: {
      name: "Optimism Mainnet",
      tokenName: "ETH",
      rpcUrl: "https://rpc.ankr.com/polygon",
      chainId: "137",
    },
  },
};
