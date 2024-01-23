export type SupportedChain = "ethereum" | "polygon";

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
  polygon: {
    testnet: {
      name: "Polygon Mumbai",
      tokenName: "MATIC",
      rpcUrl: "https://rpc.ankr.com/polygon_mumbai",
      chainId: "80001",
    },
    mainnet: {
      name: "Polygon",
      tokenName: "MATIC",
      rpcUrl: "https://rpc.ankr.com/polygon",
      chainId: "137",
    },
  },
};
