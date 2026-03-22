use borsh::{to_vec, BorshDeserialize};
use perbug_common::derive_config_pda;
use perbug_rewards_program::{
    instruction::RewardsInstruction, processor::Processor, state::RewardsConfig,
};
use solana_program::{account_info::AccountInfo, pubkey::Pubkey};

fn account<'a>(key: Pubkey, is_signer: bool, data_len: usize) -> AccountInfo<'a> {
    let key_ref = Box::leak(Box::new(key));
    let owner_ref = Box::leak(Box::new(perbug_rewards_program::id()));
    let lamports = Box::leak(Box::new(0_u64));
    let data = Box::leak(vec![0_u8; data_len].into_boxed_slice());
    AccountInfo::new(key_ref, is_signer, true, lamports, data, owner_ref, false, 0)
}

#[test]
fn initialize_config_and_serialize_instruction() {
    let program_id = perbug_rewards_program::id();
    let payer = Pubkey::new_unique();
    let admin = Pubkey::new_unique();
    let (config_key, _) = derive_config_pda(&program_id);
    let payer_ai = account(payer, true, 0);
    let config_ai = account(config_key, false, 128);
    let instruction = RewardsInstruction::InitializeConfig { admin, treasury_authority: None };
    let data = to_vec(&instruction).expect("serialize");
    let decoded = RewardsInstruction::try_from_slice(&data).expect("deserialize");
    assert_eq!(decoded, instruction);
    Processor::process(&program_id, &[payer_ai, config_ai.clone()], &data).expect("init config");
    let config =
        RewardsConfig::deserialize(&mut &config_ai.data.borrow()[..]).expect("config state");
    assert_eq!(config.admin, admin);
    assert!(!config.paused);
}
