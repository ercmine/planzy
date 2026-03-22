use borsh::{to_vec, BorshDeserialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use perbug_common::{checked_add_u64, RewardClaimedEvent, RewardReceiptCreatedEvent};

use crate::{
    error::RewardsError,
    instruction::RewardsInstruction,
    pda::assert_pda,
    state::{PlaceState, RewardReceipt, RewardsConfig},
    validation::{assert_admin, assert_not_paused, assert_signer},
};

pub struct Processor;

impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        instruction_data: &[u8],
    ) -> Result<(), ProgramError> {
        let instruction = RewardsInstruction::try_from_slice(instruction_data)
            .map_err(|_| RewardsError::InvalidInstruction)?;
        match instruction {
            RewardsInstruction::InitializeConfig { admin, treasury_authority } => {
                Self::initialize_config(program_id, accounts, admin, treasury_authority)
            }
            RewardsInstruction::InitializePlace { place_id, authority } => {
                Self::initialize_place(program_id, accounts, place_id, authority)
            }
            RewardsInstruction::CreateRewardReceipt {
                place_id,
                reward_id,
                recipient,
                amount_atomic,
                metadata_uri,
            } => Self::create_reward_receipt(
                program_id,
                accounts,
                place_id,
                reward_id,
                recipient,
                amount_atomic,
                metadata_uri,
            ),
            RewardsInstruction::ClaimReward { reward_id } => {
                Self::claim_reward(program_id, accounts, reward_id)
            }
            RewardsInstruction::SetAdmin { new_admin } => {
                Self::set_admin(program_id, accounts, new_admin)
            }
            RewardsInstruction::SetPaused { paused } => {
                Self::set_paused(program_id, accounts, paused)
            }
        }
    }

    fn initialize_config(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        admin: Pubkey,
        treasury_authority: Option<Pubkey>,
    ) -> Result<(), ProgramError> {
        let account_info_iter = &mut accounts.iter();
        let payer = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        assert_signer(payer)?;
        let (expected, _) = perbug_common::derive_config_pda(program_id);
        assert_pda(expected, config_ai.key)?;

        if !is_empty(config_ai)? {
            return Err(RewardsError::AlreadyInitialized.into());
        }

        let config = RewardsConfig { version: 1, admin, treasury_authority, paused: false };
        write_state(config_ai, &config)
    }

    fn initialize_place(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        place_id: String,
        authority: Pubkey,
    ) -> Result<(), ProgramError> {
        let account_info_iter = &mut accounts.iter();
        let admin_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        let place_ai = next_account_info(account_info_iter)?;
        assert_signer(admin_ai)?;
        let config = read_state::<RewardsConfig>(config_ai)?;
        assert_admin(&config, admin_ai.key)?;
        assert_not_paused(&config)?;
        let (expected, _) = perbug_common::derive_place_pda(program_id, &place_id);
        assert_pda(expected, place_ai.key)?;
        if !is_empty(place_ai)? {
            return Err(RewardsError::AlreadyInitialized.into());
        }
        let place =
            PlaceState { version: 1, place_id, authority, total_receipts: 0, total_claimed: 0 };
        write_state(place_ai, &place)
    }

    fn create_reward_receipt(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        place_id: String,
        reward_id: String,
        recipient: Pubkey,
        amount_atomic: u64,
        metadata_uri: String,
    ) -> Result<(), ProgramError> {
        let account_info_iter = &mut accounts.iter();
        let authority_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        let place_ai = next_account_info(account_info_iter)?;
        let receipt_ai = next_account_info(account_info_iter)?;
        assert_signer(authority_ai)?;
        let config = read_state::<RewardsConfig>(config_ai)?;
        assert_not_paused(&config)?;
        let mut place = read_state::<PlaceState>(place_ai)?;
        if place.authority != *authority_ai.key {
            return Err(RewardsError::Unauthorized.into());
        }
        let (expected_place, _) = perbug_common::derive_place_pda(program_id, &place_id);
        assert_pda(expected_place, place_ai.key)?;
        let (expected_receipt, _) =
            perbug_common::derive_reward_receipt_pda(program_id, place_ai.key, &reward_id);
        assert_pda(expected_receipt, receipt_ai.key)?;
        if !is_empty(receipt_ai)? {
            return Err(RewardsError::DuplicateReceipt.into());
        }
        let receipt = RewardReceipt {
            version: 1,
            place: *place_ai.key,
            reward_id: reward_id.clone(),
            recipient,
            amount_atomic,
            claimed: false,
            metadata_uri,
        };
        place.total_receipts =
            checked_add_u64(place.total_receipts, 1).map_err(map_common_error)?;
        write_state(place_ai, &place)?;
        write_state(receipt_ai, &receipt)?;
        let event =
            RewardReceiptCreatedEvent { place: *place_ai.key, reward_id, recipient, amount_atomic };
        msg!("reward_receipt_created: {:?}", event);
        Ok(())
    }

    fn claim_reward(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        reward_id: String,
    ) -> Result<(), ProgramError> {
        let account_info_iter = &mut accounts.iter();
        let claimer_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        let place_ai = next_account_info(account_info_iter)?;
        let receipt_ai = next_account_info(account_info_iter)?;
        assert_signer(claimer_ai)?;
        let config = read_state::<RewardsConfig>(config_ai)?;
        assert_not_paused(&config)?;
        let mut place = read_state::<PlaceState>(place_ai)?;
        let mut receipt = read_state::<RewardReceipt>(receipt_ai)?;
        let (expected_receipt, _) =
            perbug_common::derive_reward_receipt_pda(program_id, place_ai.key, &reward_id);
        assert_pda(expected_receipt, receipt_ai.key)?;
        if receipt.claimed {
            return Err(RewardsError::AlreadyClaimed.into());
        }
        if receipt.recipient != *claimer_ai.key {
            return Err(RewardsError::Unauthorized.into());
        }
        receipt.claimed = true;
        place.total_claimed = checked_add_u64(place.total_claimed, 1).map_err(map_common_error)?;
        write_state(place_ai, &place)?;
        write_state(receipt_ai, &receipt)?;
        let event =
            RewardClaimedEvent { place: *place_ai.key, reward_id, claimer: *claimer_ai.key };
        msg!("reward_claimed: {:?}", event);
        Ok(())
    }

    fn set_admin(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        new_admin: Pubkey,
    ) -> Result<(), ProgramError> {
        let _ = program_id;
        let account_info_iter = &mut accounts.iter();
        let admin_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        assert_signer(admin_ai)?;
        let mut config = read_state::<RewardsConfig>(config_ai)?;
        assert_admin(&config, admin_ai.key)?;
        config.admin = new_admin;
        write_state(config_ai, &config)
    }

    fn set_paused(
        program_id: &Pubkey,
        accounts: &[AccountInfo<'_>],
        paused: bool,
    ) -> Result<(), ProgramError> {
        let _ = program_id;
        let account_info_iter = &mut accounts.iter();
        let admin_ai = next_account_info(account_info_iter)?;
        let config_ai = next_account_info(account_info_iter)?;
        assert_signer(admin_ai)?;
        let mut config = read_state::<RewardsConfig>(config_ai)?;
        assert_admin(&config, admin_ai.key)?;
        config.paused = paused;
        write_state(config_ai, &config)
    }
}

fn is_empty(account: &AccountInfo<'_>) -> Result<bool, ProgramError> {
    let data = account.try_borrow_data()?;
    Ok(data.iter().all(|byte| *byte == 0))
}

fn read_state<T: BorshDeserialize>(account: &AccountInfo<'_>) -> Result<T, ProgramError> {
    let data = account.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    T::deserialize(&mut slice).map_err(|_| RewardsError::AccountDataTooSmall.into())
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

fn map_common_error(_: perbug_common::PerbugError) -> ProgramError {
    ProgramError::ArithmeticOverflow
}
