import { BgeoSDK } from '../src';

describe('BgeoSDK Wallet Tests', () => {
    const sdk = new BgeoSDK({
        apiKey: 'test-api-key'
    });

    it('should generate a valid wallet', () => {
        const wallet = sdk.generateWallet();
        expect(wallet).toHaveProperty('address');
        expect(wallet).toHaveProperty('privateKey');
        expect(wallet).toHaveProperty('publicKey');
        expect(wallet).toHaveProperty('mnemonic');
        expect(wallet.address).toMatch(/^bo/); // BGEO 주소는 'bo'로 시작
    });
});