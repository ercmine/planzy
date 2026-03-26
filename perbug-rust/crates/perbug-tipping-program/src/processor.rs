use borsh::{to_vec, BorshDeserialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use dryad_common::{checked_mul_u64, checked_sub_u64, TipRecordedEvent, MAX_BPS};

use crate::{
    error::TippingError,
    instruction::TippingInstruction,
    pda::assert_pda,
    state::{TipReceipt, TippingConfig},
    validation::{assert_admin, assert_not_paused, assert_signer},
};

pub struct Processor;

impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        instruction_data: &[u8],
    ) -> Result<(), ProgramError> {
        let instruction = TippingInstruction::try_from_slice(instruction_data)
            .map_err(|_| TippingError::InvalidInstruction)?;
        match instruction {
            TippingInstruction::InitializeConfig { admin, fee_bps } => {
                Self::initialize_config(program_id, accounts, admin, fee_bps)
            }
            TippingInstruction::RecordTip { tip_id, from, to, amount_atomic } => {
                Self::record_tip(program_id, accounts, tip_id, from, to, amount_atomic, None)
            }
            TippingInstruction::RecordTipWithFee { tip_id, from, to, amount_atomic, fee_bps } => {
                Self::record_tip(
                    program_id,
                    accounts,
                    tip_id,
                    from,
                    to,
                    amount_atomic,
                    Some(fee_bps),
                )
            }
            TippingInstruction::SetFeeBps { fee_bps } => Self::set_fee_bps(accounts, fee_bps),
            TippingInstruction::SetAdmin { new_admin } => Self::set_admin(accounts, new_admin),
            TippingInstruction::SetPaused { paused } => Self::set_paused(accounts, paused),
        }
    }

    fn initialize_config(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        admin: Pubkey,
        fee_bps: u16,
    ) -> Result<(), ProgramError> {
        validate_fee_bps(fee_bps)?;
        let account_info_iter = &mut accounts.iter();
        let payer = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        assert_signer(payer)?;
        let (expected, _) = dryad_common::derive_config_pda(program_id);
        assert_pda(expected, config_ai.key)?;
        if !is_empty(config_ai)? {
            return Err(TippingError::AlreadyInitialized.into());
        }
        let config = TippingConfig { version: 1, admin, fee_bps, paused: false };
        write_state(config_ai, &config)
    }

    fn record_tip(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        tip_id: String,
        from: Pubkey,
        to: Pubkey,
        amount_atomic: u64,
        fee_override: Option<u16>,
    ) -> Result<(), ProgramError> {
        let account_info_iter = &mut accounts.iter();
        let signer_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        let receipt_ai = next_account_info(account_info_iter)?;
        assert_signer(signer_ai)?;
        if *signer_ai.key != from {
            return Err(TippingError::Unauthorized.into());
        }
        let config = read_state::<TippingConfig>(config_ai)?;
        assert_not_paused(&config)?;
        let fee_bps = fee_override.unwrap_or(config.fee_bps);
        validate_fee_bps(fee_bps)?;
        let (expected_receipt, _) = dryad_common::derive_tip_receipt_pda(program_id, &tip_id);
        assert_pda(expected_receipt, receipt_ai.key)?;
        if !is_empty(receipt_ai)? {
            return Err(TippingError::DuplicateReceipt.into());
        }
        let fee_amount_atomic = calculate_fee(amount_atomic, fee_bps)?;
        let net_amount_atomic = checked_sub_u64(amount_atomic, fee_amount_atomic)
            .map_err(|_| ProgramError::ArithmeticOverflow)?;
        let receipt = TipReceipt {
            version: 1,
            tip_id: tip_id.clone(),
            from,
            to,
            gross_amount_atomic: amount_atomic,
            fee_amount_atomic,
            net_amount_atomic,
        };
        write_state(receipt_ai, &receipt)?;
        msg!(
            "tip_recorded: {:?}",
            TipRecordedEvent {
                tip_id,
                from,
                to,
                gross_atomic: amount_atomic,
                fee_atomic: fee_amount_atomic
            }
        );
        Ok(())
    }

    fn set_fee_bps(accounts: &[AccountInfo<'_>], fee_bps: u16) -> Result<(), ProgramError> {
        validate_fee_bps(fee_bps)?;
        let account_info_iter = &mut accounts.iter();
        let admin_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        assert_signer(admin_ai)?;
        let mut config = read_state::<TippingConfig>(config_ai)?;
        assert_admin(&config, admin_ai.key)?;
        config.fee_bps = fee_bps;
        write_state(config_ai, &config)
    }

    fn set_admin(accounts: &[AccountInfo<'_>], new_admin: Pubkey) -> Result<(), ProgramError> {
        let account_info_iter = &mut accounts.iter();
        let admin_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        assert_signer(admin_ai)?;
        let mut config = read_state::<TippingConfig>(config_ai)?;
        assert_admin(&config, admin_ai.key)?;
        config.admin = new_admin;
        write_state(config_ai, &config)
    }

    fn set_paused(accounts: &[AccountInfo<'_>], paused: bool) -> Result<(), ProgramError> {
        let account_info_iter = &mut accounts.iter();
        let admin_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        assert_signer(admin_ai)?;
        let mut config = read_state::<TippingConfig>(config_ai)?;
        assert_admin(&config, admin_ai.key)?;
        config.paused = paused;
        write_state(config_ai, &config)
    }
}

fn validate_fee_bps(fee_bps: u16) -> Result<(), ProgramError> {
    if fee_bps > MAX_BPS {
        return Err(TippingError::InvalidFeeBps.into());
    }
    Ok(())
}

fn calculate_fee(amount_atomic: u64, fee_bps: u16) -> Result<u64, ProgramError> {
    let scaled = checked_mul_u64(amount_atomic, fee_bps as u64)
        .map_err(|_| ProgramError::ArithmeticOverflow)?;
    Ok(scaled / MAX_BPS as u64)
}

fn is_empty(account: &AccountInfo<'_>) -> Result<bool, ProgramError> {
    let data = account.try_borrow_data()?;
    Ok(data.iter().all(|byte| *byte == 0))
}

fn read_state<T: BorshDeserialize>(account: &AccountInfo<'_>) -> Result<T, ProgramError> {
    let data = account.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    T::deserialize(&mut slice).map_err(|_| TippingError::AccountDataTooSmall.into())
}

fn write_state<T: borsh::BorshSerialize>(
    account: &AccountInfo<'_>,
    value: &T,
) -> Result<(), ProgramError> {
    let encoded = to_vec(value).map_err(|_| ProgramError::InvalidAccountData)?;
    let mut data = account.try_borrow_mut_data()?;
    if encoded.len() > data.len() {
        return Err(ProgramError::AccountDataTooSmall);
    }
    data.fill(0);
    data[..encoded.len()].copy_from_slice(&encoded);
    Ok(())
}
