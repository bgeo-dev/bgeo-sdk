import { BgeoSDK } from '@bgeo/sdk';

async function main() {
    // SDK 초기화
    const sdk = new BgeoSDK('YOUR_API_KEY');

    // 새 지갑 생성
    const wallet = sdk.generateWallet();
    console.log('New wallet:', wallet);

    // 트랜잭션 전송
    try {
        const txHash = await sdk.sendTransaction(
            wallet.address,
            'bo1destination_address',
            '1.0',
            wallet.privateKey
        );
        console.log('Transaction sent:', txHash);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();