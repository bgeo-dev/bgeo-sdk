import axios from 'axios';
import { WalletService } from './lib/wallet';
import { TransactionService } from './lib/transaction';
import { NetworkConfig, SDKConfig, WalletInfo } from './types';

const DEFAULT_NETWORK: NetworkConfig = {
  messagePrefix: '\x18BGEO Signed Message:\n',
  bech32: 'bo',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x00,
  scriptHash: 0x73,
  wif: 0x80
};

export interface TransferTarget {
  address: string;
  amount: string;
}

export class BgeoSDK {
  private readonly walletService: WalletService;
  private readonly transactionService: TransactionService;
  private readonly apiUrl: string;
  private readonly rpcUrl: string;
  private readonly apiKey: string;

  constructor(config: SDKConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.bgeo.app/api/v1';
    this.rpcUrl = config.rpcUrl || 'https://rpc.bgeo.app/api/v1';
    const network = config.network || DEFAULT_NETWORK;

    this.walletService = new WalletService(network);
    this.transactionService = new TransactionService(network);
  }

  public generateWallet(): WalletInfo {
    return this.walletService.generateWallet();
  }

  public createWalletFromMnemonic(mnemonic: string): WalletInfo {
    return this.walletService.createWalletFromMnemonic(mnemonic);
  }

  public async sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string,
    privateKey: string,
    fee: string = '0.0001'
  ): Promise<string> {
    const utxos = await this.getUtxos(fromAddress);
    const signedTx = this.transactionService.createTransaction(
      fromAddress,
      toAddress,
      amount,
      utxos,
      privateKey,
      fee
    );
    return this.broadcastTransaction(signedTx);
  }

  public async sendBatchTransaction(
    fromAddress: string,
    recipients: TransferTarget[],
    privateKey: string,
    fee: string = '0.0001'
  ): Promise<string> {
    const utxos = await this.getUtxos(fromAddress);
    const signedTx = this.transactionService.createBatchTransaction(
      fromAddress,
      recipients,
      utxos,
      privateKey,
      fee
    );
    return this.broadcastTransaction(signedTx);
  }

  public async createSimpleLockupTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string,
    privateKey: string,
    lockUntilTimestamp: number,
    fee: string = '0.0001'
  ): Promise<string> {
    const utxos = await this.getUtxos(fromAddress);
    const signedTx = this.transactionService.createSimpleLockupTransaction(
      fromAddress,
      toAddress,
      amount,
      utxos,
      privateKey,
      lockUntilTimestamp,
      fee
    );
    return this.broadcastTransaction(signedTx);
  }

  private async getUtxos(address: string) {
    const response = await axios.get(`${this.apiUrl}/utxo/${address}`);
    return response.data;
  }

  private async broadcastTransaction(signedTx: string): Promise<string> {
    const response = await axios.post(
      this.rpcUrl,
      {
        method: 'sendrawtransaction',
        params: [signedTx]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      }
    );
    return response.data.result;
  }
}

export * from './types';
