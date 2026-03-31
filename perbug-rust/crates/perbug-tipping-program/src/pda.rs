pub use perbug_common::{derive_config_pda, derive_tip_receipt_pda};
use solana_program::pubkey::Pubkey;

pub fn assert_pda(expected: Pubkey, provided: &Pubkey) -> Result<(), super::error::TippingError> {
    if expected != *provided {
        return Err(super::error::TippingError::InvalidPda);
    }
    Ok(())
}
