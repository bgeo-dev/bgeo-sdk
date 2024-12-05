import { WalletService } from '../../src/lib/wallet';
import { NetworkConfig } from '../../src/types';

describe('WalletService', () => {
    const testNetwork: NetworkConfig = {
        messagePrefix: '\x18BGEO Signed Message:\n',
        bech32: 'bo',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4,
        },
        pubKeyHash: 0x00,
        scriptHash: 0x73,
        wif: 0x80,
    };

    const walletService = new WalletService(testNetwork);

    describe('generateWallet', () => {
        it('should generate a new wallet with valid properties', () => {
            const wallet = walletService.generateWallet();

            expect(wallet).toHaveProperty('address');
            expect(wallet).toHaveProperty('privateKey');
            expect(wallet).toHaveProperty('publicKey');
            expect(wallet).toHaveProperty('mnemonic');

            // BGEO 주소 형식 검증
            expect(wallet.address).toMatch(/^bo/);
            expect(wallet.address.length).toBeGreaterThan(32);

            // 개인키 검증
            expect(wallet.privateKey).not.toBeNull();
            expect(typeof wallet.privateKey).toBe('string');
            expect(wallet.privateKey?.length).toBe(64);

            // 공개키 검증
            expect(typeof wallet.publicKey).toBe('string');
            expect(wallet.publicKey.length).toBeGreaterThan(64);

            // 니모닉 검증
            expect(wallet.mnemonic.split(' ').length).toBe(24); // 256 비트 니모닉은 24개 단어
        });
    });

    describe('createWalletFromMnemonic', () => {
        it('should restore wallet from valid mnemonic', () => {
            const originalWallet = walletService.generateWallet();
            const restoredWallet = walletService.createWalletFromMnemonic(originalWallet.mnemonic);

            expect(restoredWallet.address).toBe(originalWallet.address);
            expect(restoredWallet.privateKey).toBe(originalWallet.privateKey);
            expect(restoredWallet.publicKey).toBe(originalWallet.publicKey);
        });

        it('should throw error for invalid mnemonic', () => {
            const invalidMnemonic = 'invalid mnemonic phrase';
            expect(() => walletService.createWalletFromMnemonic(invalidMnemonic)).toThrow();
        });
    });
});