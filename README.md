# BGEO SDK
This is the official JavaScript/TypeScript SDK for the BGEO blockchain.

## Installation

```bash
npm install @bgeo/sdk
```

## Features
- Create Wallet, Send Transaction, Get Transaction, Get Balance, Get UTXO

## Usage Example

```typescript
import { BgeoSDK } from '@bgeo/sdk';

// Initialize SDK
const sdk = new BgeoSDK({
  apiKey: 'YOUR_API_KEY'
});

// Create new wallet
const wallet = sdk.generateWallet();
console.log('New wallet:', wallet);

// Send transaction
const txHash = await sdk.sendTransaction(
  'fromAddress',
  'toAddress',
  '1.0', // amount
  'privateKey'
);
console.log('Transaction sent:', txHash);
```

## API Documentation

Detailed API documentation is available [here](https://docs.bgeo.app).

## License

MIT License