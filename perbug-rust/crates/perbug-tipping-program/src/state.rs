use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(Debug, Clone, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct TippingConfig {
    pub version: u8,
    pub admin: Pubkey,
    pub fee_bps: u16,
    pub paused: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct TipReceipt {
    pub version: u8,
    pub tip_id: String,
    pub from: Pubkey,
    pub to: Pubkey,
    pub gross_amount_atomic: u64,
    pub fee_amount_atomic: u64,
    pub net_amount_atomic: u64,
}
