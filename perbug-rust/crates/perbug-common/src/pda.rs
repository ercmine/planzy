use solana_program::pubkey::Pubkey;

use crate::constants::{CONFIG_SEED, PLACE_SEED, REWARD_RECEIPT_SEED, TIP_RECEIPT_SEED};

pub fn derive_config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG_SEED], program_id)
}

pub fn derive_place_pda(program_id: &Pubkey, place_id: &str) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[PLACE_SEED, place_id.as_bytes()], program_id)
}

pub fn derive_reward_receipt_pda(
    program_id: &Pubkey,
    place: &Pubkey,
    reward_id: &str,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[REWARD_RECEIPT_SEED, place.as_ref(), reward_id.as_bytes()],
        program_id,
    )
}

pub fn derive_tip_receipt_pda(program_id: &Pubkey, tip_id: &str) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[TIP_RECEIPT_SEED, tip_id.as_bytes()], program_id)
}
