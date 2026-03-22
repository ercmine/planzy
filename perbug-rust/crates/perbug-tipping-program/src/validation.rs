use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};

use crate::{error::TippingError, state::TippingConfig};

pub fn assert_signer(account: &AccountInfo<'_>) -> Result<(), ProgramError> {
    if !account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    Ok(())
}

pub fn assert_admin(config: &TippingConfig, signer: &Pubkey) -> Result<(), ProgramError> {
    if config.admin != *signer {
        return Err(TippingError::Unauthorized.into());
    }
    Ok(())
}

pub fn assert_not_paused(config: &TippingConfig) -> Result<(), ProgramError> {
    if config.paused {
        return Err(TippingError::Paused.into());
    }
    Ok(())
}
