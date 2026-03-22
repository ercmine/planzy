use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};
use solana_program::pubkey::Pubkey;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct RewardReceiptCreatedEvent {
    pub place: Pubkey,
    pub reward_id: String,
    pub recipient: Pubkey,
    pub amount_atomic: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct RewardClaimedEvent {
    pub place: Pubkey,
    pub reward_id: String,
    pub claimer: Pubkey,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct TipRecordedEvent {
    pub tip_id: String,
    pub from: Pubkey,
    pub to: Pubkey,
    pub gross_atomic: u64,
    pub fee_atomic: u64,
}
