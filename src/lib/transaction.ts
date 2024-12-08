import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import ecc from '@bitcoinerlab/secp256k1';
import BigNumber from 'bignumber.js';
import { NetworkConfig, UTXO, TransferTarget } from '../types';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

interface BitcoinNetwork {
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

export class TransactionService {
  constructor(private readonly network: NetworkConfig) {}

  public createTransaction(
    from: string,
    to: string,
    amount: string,
    utxos: UTXO[],
    privateKey: string,
    fee: string = '0.0001'
  ): string {
    const psbt = new bitcoin.Psbt({ network: this.network as BitcoinNetwork });

    let inputAmount = 0;
    const unspentUtxos = utxos.filter((utxo) => utxo.status === 'unspent');

    // Add input
    unspentUtxos.forEach((input) => {
      const satoshiValue = Number(new BigNumber(input.value).multipliedBy(100000000).toFixed(0));
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          script: Buffer.from(
            bitcoin.address.toOutputScript(input.address, this.network as BitcoinNetwork)
          ),
          value: BigInt(satoshiValue)
        }
      });
      inputAmount += satoshiValue;
    });

    // Add output
    const satoshiAmount = Number(new BigNumber(amount).multipliedBy(100000000).toFixed(0));
    psbt.addOutput({
      address: to,
      value: BigInt(satoshiAmount)
    });

    // Calculate fee and change output
    const feeAmount = Number(new BigNumber(fee).multipliedBy(100000000).toFixed(0));
    const changeAmount = inputAmount - satoshiAmount - feeAmount;
    if (changeAmount > 0) {
      psbt.addOutput({
        address: from,
        value: BigInt(changeAmount)
      });
    }

    // Sign transaction
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), {
      network: this.network as BitcoinNetwork
    });
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  }

  public createBatchTransaction(
    from: string,
    recipients: TransferTarget[],
    utxos: UTXO[],
    privateKey: string,
    fee: string = '0.0001'
  ): string {
    const psbt = new bitcoin.Psbt({ network: this.network as BitcoinNetwork });

    // 입력 금액 계산
    let inputAmount = 0;
    const unspentUtxos = utxos.filter((utxo) => utxo.status === 'unspent');

    // Add UTXO input
    unspentUtxos.forEach((input) => {
      const satoshiValue = Number(new BigNumber(input.value).multipliedBy(100000000).toFixed(0));
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          script: Buffer.from(
            bitcoin.address.toOutputScript(input.address, this.network as BitcoinNetwork)
          ),
          value: BigInt(satoshiValue)
        }
      });
      inputAmount += satoshiValue;
    });

    // Add output for each recipient
    let totalOutputAmount = 0;
    recipients.forEach((recipient) => {
      const satoshiAmount = Number(
        new BigNumber(recipient.amount).multipliedBy(100000000).toFixed(0)
      );
      psbt.addOutput({
        address: recipient.address,
        value: BigInt(satoshiAmount)
      });
      totalOutputAmount += satoshiAmount;
    });

    // Calculate fee and change output
    const feeAmount = Number(new BigNumber(fee).multipliedBy(100000000).toFixed(0));
    const changeAmount = inputAmount - totalOutputAmount - feeAmount;
    if (changeAmount > 0) {
      psbt.addOutput({
        address: from,
        value: BigInt(changeAmount)
      });
    }

    // Sign transaction
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), {
      network: this.network as BitcoinNetwork
    });
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  }
}
