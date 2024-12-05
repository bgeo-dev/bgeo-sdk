import { CryptoService } from './crypto';
import { NetworkConfig, WalletInfo } from '../types';

export class WalletService {
    private readonly cryptoService: CryptoService;

    constructor(network: NetworkConfig) {
        this.cryptoService = new CryptoService(network);
    }

    public generateWallet(): WalletInfo {
        const mnemonic = this.cryptoService.generateMnemonic();
        return this.createWalletFromMnemonic(mnemonic);
    }

    public createWalletFromMnemonic(mnemonic: string): WalletInfo {
        if (!this.cryptoService.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase');
        }

        const seed = this.cryptoService.generateSeed(mnemonic);
        const { privateKey, publicKey, child } = this.cryptoService.deriveKeyPair(seed);
        const address = this.cryptoService.createBech32Address(child.publicKey);

        return {
            address,
            privateKey: privateKey || null,
            publicKey,
            mnemonic
        };
    }

    public deriveAddress(seed: string, index: number): WalletInfo {
        const seedBuffer = Buffer.from(seed, 'hex');
        const path = `m/84'/0'/0'/0/${index}`;
        const { privateKey, publicKey, child } = this.cryptoService.deriveKeyPair(seedBuffer, path);
        const address = this.cryptoService.createBech32Address(child.publicKey);

        return {
            address,
            privateKey: privateKey || null,
            publicKey,
            mnemonic: '' // for derived address, mnemonic is empty string
        };
    }
}