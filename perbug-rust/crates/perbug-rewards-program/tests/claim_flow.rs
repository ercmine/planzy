use borsh::{to_vec, BorshDeserialize};
use perbug_common::{derive_config_pda, derive_place_pda, derive_reward_receipt_pda};
use perbug_rewards_program::{
    instruction::RewardsInstruction,
    processor::Processor,
    state::{PlaceState, RewardReceipt, RewardsConfig},
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
fn full_claim_flow_marks_receipt_claimed() {
    let program_id = perbug_rewards_program::id();
    let admin = Pubkey::new_unique();
    let recipient = Pubkey::new_unique();
    let place_id = "place-123".to_string();
    let reward_id = "review-abc".to_string();
    let (config_key, _) = derive_config_pda(&program_id);
    let (place_key, _) = derive_place_pda(&program_id, &place_id);
    let (receipt_key, _) = derive_reward_receipt_pda(&program_id, &place_key, &reward_id);
    let payer_ai = account(admin, true, 0);
    let config_ai = account(config_key, false, 128);
    Processor::process(
        &program_id,
        &[payer_ai.clone(), config_ai.clone()],
        &to_vec(&RewardsInstruction::InitializeConfig { admin, treasury_authority: None }).unwrap(),
    )
    .unwrap();
    let place_ai = account(place_key, false, 256);
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
    let receipt_ai = account(receipt_key, false, 512);
    Processor::process(
        &program_id,
        &[payer_ai.clone(), config_ai.clone(), place_ai.clone(), receipt_ai.clone()],
        &to_vec(&RewardsInstruction::CreateRewardReceipt {
            place_id: place_id.clone(),
            reward_id: reward_id.clone(),
            recipient,
            amount_atomic: 50_000_000,
            metadata_uri: "https://example.com/reward.json".into(),
        })
        .unwrap(),
    )
    .unwrap();
    let claimer_ai = account(recipient, true, 0);
    Processor::process(
        &program_id,
        &[claimer_ai, config_ai.clone(), place_ai.clone(), receipt_ai.clone()],
        &to_vec(&RewardsInstruction::ClaimReward { reward_id: reward_id.clone() }).unwrap(),
    )
    .unwrap();
    let receipt = RewardReceipt::deserialize(&mut &receipt_ai.data.borrow()[..]).unwrap();
    let place = PlaceState::deserialize(&mut &place_ai.data.borrow()[..]).unwrap();
    let _config = RewardsConfig::deserialize(&mut &config_ai.data.borrow()[..]).unwrap();
    assert!(receipt.claimed);
    assert_eq!(place.total_receipts, 1);
    assert_eq!(place.total_claimed, 1);
}
