# Token Model

## DRYAD assumptions

- Token symbol: `DRYAD`
- Default decimals: `6`
- Base token program: standard SPL Token
- Future compatibility: Token-2022 is intentionally left optional so extensions can be introduced without rewriting the workspace structure.

## Mint and treasury model

- One canonical DRYAD mint is expected per environment.
- A treasury owner can hold the project treasury ATA for developer minting and future reward payouts.
- The CLI helps create the mint, derive token accounts, and inspect balances.

## Rewards relationship

The rewards program is designed to track eligibility/claims independently from how tokens are actually distributed. In v1, reward receipts prove that a unique reward ID has been recorded and optionally claimed; treasury transfer logic can later be added via CPI.

## Tipping relationship

The tipping program records creator tip receipts and optional platform fees. Recording receipts first ensures fee calculations, duplicate prevention, and admin controls are validated before full escrow or settlement logic is introduced.
