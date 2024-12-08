// network config type
export interface NetworkConfig {
  messagePrefix: string;
  bech32: string;
  bip32: {
    public: number;
    private: number;
  };
  pubKeyHash: number;
  scriptHash: number;
  wif: number;
}

// wallet info type
export interface WalletInfo {
  address: string;
  privateKey: string | null;
  publicKey: string;
  mnemonic: string;
}

// UTXO type
export interface UTXO {
  txid: string;
  vout: number;
  value: string;
  status: string;
  address: string;
}

export interface TransferTarget {
  address: string;
  amount: string;
}

// transaction result type
export interface TransactionResult {
  address: string;
  amount: string;
  txHash?: string;
  error?: string;
  status: 'success' | 'failed';
}

// SDK config type
export interface SDKConfig {
  apiKey: string;
  apiUrl?: string;
  rpcUrl?: string;
  network?: NetworkConfig;
}
