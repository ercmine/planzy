use borsh::to_vec;
use perbug_common::{derive_config_pda, derive_place_pda, derive_reward_receipt_pda};
use perbug_rewards_program::{
    error::RewardsError, instruction::RewardsInstruction, processor::Processor,
};
use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};

fn account<'a>(key: Pubkey, is_signer: bool, data_len: usize) -> AccountInfo<'a> {
    let key_ref = Box::leak(Box::new(key));
    let owner_ref = Box::leak(Box::new(perbug_rewards_program::id()));
    let lamports = Box::leak(Box::new(0_u64));
    let data = Box::leak(vec![0_u8; data_len].into_boxed_slice());
    AccountInfo::new(key_ref, is_signer, true, lamports, data, owner_ref, false, 0)
}

#[test]
fn duplicate_receipt_creation_fails() {
    let program_id = perbug_rewards_program::id();
    let admin = Pubkey::new_unique();
    let recipient = Pubkey::new_unique();
    let place_id = "place-dup".to_string();
    let reward_id = "reward-1".to_string();
    let (config_key, _) = derive_config_pda(&program_id);
    let (place_key, _) = derive_place_pda(&program_id, &place_id);
    let (receipt_key, _) = derive_reward_receipt_pda(&program_id, &place_key, &reward_id);
    let payer_ai = account(admin, true, 0);
    let config_ai = account(config_key, false, 128);
    let place_ai = account(place_key, false, 256);
    let receipt_ai = account(receipt_key, false, 512);
    Processor::process(
        &program_id,
        &[payer_ai.clone(), config_ai.clone()],
        &to_vec(&RewardsInstruction::InitializeConfig { admin, treasury_authority: None }).unwrap(),
    )
    .unwrap();
    Processor::process(
        &program_id,
        &[payer_ai.clone(), config_ai.clone(), place_ai.clone()],
        &to_vec(&RewardsInstruction::InitializePlace {
            place_id: place_id.clone(),
            authority: admin,
        })
        .unwrap(),
    )
    .unwrap();
    let data = to_vec(&RewardsInstruction::CreateRewardReceipt {
        place_id: place_id.clone(),
        reward_id: reward_id.clone(),
        recipient,
        amount_atomic: 1,
        metadata_uri: String::new(),
    })
    .unwrap();
    Processor::process(
        &program_id,
        &[payer_ai.clone(), config_ai.clone(), place_ai.clone(), receipt_ai.clone()],
        &data,
    )
    .unwrap();
    let err = Processor::process(&program_id, &[payer_ai, config_ai, place_ai, receipt_ai], &data)
        .unwrap_err();
    assert_eq!(err, ProgramError::Custom(RewardsError::DuplicateReceipt as u32));
}
