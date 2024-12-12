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
  constructor(private readonly network: NetworkConfig) { }

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

    // calculate input amount
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

  public createLockupTransaction(
    from: string,
    to: string,
    amount: string,
    utxos: UTXO[],
    privateKey: string,
    lockUntilTimestamp: number,
    fee: string = '0.0001'
  ): string {
    const psbt = new bitcoin.Psbt({ network: this.network as BitcoinNetwork });

    // calculate input amount
    let inputAmount = 0;
    const unspentUtxos = utxos.filter((utxo) => utxo.status === 'unspent');

    // add UTXO input
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

    // create lockup script
    const satoshiAmount = Number(new BigNumber(amount).multipliedBy(100000000).toFixed(0));

    // create CLTV script
    const lockScript = bitcoin.script.compile([
      bitcoin.script.number.encode(lockUntilTimestamp),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      bitcoin.opcodes.OP_DUP,
      bitcoin.opcodes.OP_HASH160,
      bitcoin.address.fromBech32(to).data,
      bitcoin.opcodes.OP_EQUALVERIFY,
      bitcoin.opcodes.OP_CHECKSIG,
    ]);

    // add P2SH output
    const p2sh = bitcoin.payments.p2sh({
      redeem: { output: lockScript, network: this.network as BitcoinNetwork },
      network: this.network as BitcoinNetwork
    });

    psbt.addOutput({
      script: p2sh.output!,
      value: BigInt(satoshiAmount)
    });

    // calculate change and add output
    const feeAmount = Number(new BigNumber(fee).multipliedBy(100000000).toFixed(0));
    const changeAmount = inputAmount - satoshiAmount - feeAmount;
    if (changeAmount > 0) {
      psbt.addOutput({
        address: from,
        value: BigInt(changeAmount)
      });
    }

    // sign transaction
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), {
      network: this.network as BitcoinNetwork
    });
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  }

  public createUnlockTransaction(
    lockedUtxo: UTXO,
    recipientAddress: string,
    lockScript: Buffer,
    privateKey: string,
    fee: string = '0.0001'
  ): string {
    const psbt = new bitcoin.Psbt({ network: this.network as BitcoinNetwork });

    // add locked UTXO as input
    const satoshiValue = Number(new BigNumber(lockedUtxo.value).multipliedBy(100000000).toFixed(0));
    psbt.addInput({
      hash: lockedUtxo.txid,
      index: lockedUtxo.vout,
      witnessUtxo: {
        script: lockScript,
        value: BigInt(satoshiValue)
      },
      redeemScript: lockScript
    });

    // calculate fee
    const feeAmount = Number(new BigNumber(fee).multipliedBy(100000000).toFixed(0));
    const outputAmount = satoshiValue - feeAmount;

    // add output to recipient address
    psbt.addOutput({
      address: recipientAddress,
      value: BigInt(outputAmount)
    });

    // sign transaction
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), {
      network: this.network as BitcoinNetwork
    });
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  }

  public createSimpleLockupTransaction(
    from: string,
    to: string,
    amount: string,
    utxos: UTXO[],
    privateKey: string,
    lockUntilTimestamp: number,
    fee: string = '0.0001'
  ): string {
    const psbt = new bitcoin.Psbt({ network: this.network as BitcoinNetwork });

    // set nLockTime
    psbt.setLocktime(lockUntilTimestamp);

    let inputAmount = 0;
    const unspentUtxos = utxos.filter((utxo) => utxo.status === 'unspent');

    // add UTXO input
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
        },
        sequence: 0xfffffffe  // activate nLockTime
      });
      inputAmount += satoshiValue;
    });

    // add output
    const satoshiAmount = Number(new BigNumber(amount).multipliedBy(100000000).toFixed(0));
    psbt.addOutput({
      address: to,
      value: BigInt(satoshiAmount)
    });

    // calculate change
    const feeAmount = Number(new BigNumber(fee).multipliedBy(100000000).toFixed(0));
    const changeAmount = inputAmount - satoshiAmount - feeAmount;
    if (changeAmount > 0) {
      psbt.addOutput({
        address: from,
        value: BigInt(changeAmount)
      });
    }

    // sign transaction
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), {
      network: this.network as BitcoinNetwork
    });
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  }
}
