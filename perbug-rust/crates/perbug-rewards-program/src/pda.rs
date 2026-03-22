use solana_program::pubkey::Pubkey;

pub use perbug_common::{derive_config_pda, derive_place_pda, derive_reward_receipt_pda};

pub fn assert_pda(expected: Pubkey, provided: &Pubkey) -> Result<(), super::error::RewardsError> {
    if expected != *provided {
        return Err(super::error::RewardsError::InvalidPda);
    }
    Ok(())
}
