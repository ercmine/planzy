use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(Debug, Clone, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct RewardsConfig {
    pub version: u8,
    pub admin: Pubkey,
    pub treasury_authority: Option<Pubkey>,
    pub paused: bool,
}

impl RewardsConfig {
    pub const LEN: usize = 1 + 32 + 1 + 32 + 1;
}

#[derive(Debug, Clone, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct PlaceState {
    pub version: u8,
    pub place_id: String,
    pub authority: Pubkey,
    pub total_receipts: u64,
    pub total_claimed: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct RewardReceipt {
    pub version: u8,
    pub place: Pubkey,
    pub reward_id: String,
    pub recipient: Pubkey,
    pub amount_atomic: u64,
    pub claimed: bool,
    pub metadata_uri: String,
}
