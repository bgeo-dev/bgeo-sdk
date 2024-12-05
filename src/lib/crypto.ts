import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import ecc from '@bitcoinerlab/secp256k1';
import { bech32 } from 'bech32';
import { NetworkConfig } from '../types';

const bip32 = BIP32Factory(ecc);

export class CryptoService {
    constructor(private readonly network: NetworkConfig) { }

    public generateMnemonic(): string {
        return bip39.generateMnemonic(256);
    }

    public validateMnemonic(mnemonic: string): boolean {
        return bip39.validateMnemonic(mnemonic);
    }

    public generateSeed(mnemonic: string): Buffer {
        return bip39.mnemonicToSeedSync(mnemonic);
    }

    public deriveKeyPair(seed: Buffer, path: string = "m/84'/0'/0'/0/0") {
        const root = bip32.fromSeed(seed);
        const child = root.derivePath(path);

        return {
            privateKey: Buffer.from(child.privateKey || []).toString('hex'),
            publicKey: Buffer.from(child.publicKey).toString('hex'),
            child
        };
    }

    public createBech32Address(pubkey: Buffer): string {
        const pubKeyHash = bitcoin.crypto.hash160(pubkey);
        const words = bech32.toWords(pubKeyHash);
        return bech32.encode(this.network.bech32, [0, ...words]);
    }

    public convertPrivateKey(privateKey: string): Buffer {
        return Buffer.from(privateKey, 'hex');
    }
}