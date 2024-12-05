import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import ecc from '@bitcoinerlab/secp256k1';
import BigNumber from 'bignumber.js';
import { NetworkConfig, UTXO } from '../types';

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
        const unspentUtxos = utxos.filter(utxo => utxo.status === "unspent");

        // 입력 추가
        unspentUtxos.forEach(input => {
            const satoshiValue = Number(new BigNumber(input.value).multipliedBy(100000000).toFixed(0));
            psbt.addInput({
                hash: input.txid,
                index: input.vout,
                witnessUtxo: {
                    script: Buffer.from(bitcoin.address.toOutputScript(input.address, this.network as BitcoinNetwork)),
                    value: satoshiValue
                },
            });
            inputAmount += satoshiValue;
        });

        // 출력 추가
        const satoshiAmount = Number(new BigNumber(amount).multipliedBy(100000000).toFixed(0));
        psbt.addOutput({
            address: to,
            value: satoshiAmount,
        });

        // 수수료 계산 및 거스름돈 출력 추가
        const feeAmount = Number(new BigNumber(fee).multipliedBy(100000000).toFixed(0));
        const changeAmount = inputAmount - satoshiAmount - feeAmount;
        if (changeAmount > 0) {
            psbt.addOutput({
                address: from,
                value: changeAmount
            });
        }

        // 트랜잭션 서명
        const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network: this.network as BitcoinNetwork });
        psbt.signAllInputs(keyPair);
        psbt.finalizeAllInputs();

        return psbt.extractTransaction().toHex();
    }
}