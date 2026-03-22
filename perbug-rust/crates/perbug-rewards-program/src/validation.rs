use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};

use crate::{error::RewardsError, state::RewardsConfig};

pub fn assert_signer(account: &AccountInfo<'_>) -> Result<(), ProgramError> {
    if !account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    Ok(())
}

pub fn assert_admin(config: &RewardsConfig, signer: &Pubkey) -> Result<(), ProgramError> {
    if config.admin != *signer {
        return Err(RewardsError::Unauthorized.into());
    }
    Ok(())
}

pub fn assert_not_paused(config: &RewardsConfig) -> Result<(), ProgramError> {
    if config.paused {
        return Err(RewardsError::Paused.into());
    }
    Ok(())
}
