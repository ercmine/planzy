use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(Debug, Clone, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub enum RewardsInstruction {
    InitializeConfig {
        admin: Pubkey,
        treasury_authority: Option<Pubkey>,
    },
    InitializePlace {
        place_id: String,
        authority: Pubkey,
    },
    CreateRewardReceipt {
        place_id: String,
        reward_id: String,
        recipient: Pubkey,
        amount_atomic: u64,
        metadata_uri: String,
    },
    ClaimReward {
        reward_id: String,
    },
    SetAdmin {
        new_admin: Pubkey,
    },
    SetPaused {
        paused: bool,
    },
}
