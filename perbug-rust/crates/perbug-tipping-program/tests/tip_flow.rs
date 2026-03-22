use borsh::{to_vec, BorshDeserialize};
use perbug_common::{derive_config_pda, derive_tip_receipt_pda};
use perbug_tipping_program::{
    instruction::TippingInstruction, processor::Processor, state::TipReceipt,
};
use solana_program::{account_info::AccountInfo, pubkey::Pubkey};

fn account<'a>(key: Pubkey, is_signer: bool, data_len: usize) -> AccountInfo<'a> {
    let key_ref = Box::leak(Box::new(key));
    let owner_ref = Box::leak(Box::new(perbug_tipping_program::id()));
    let lamports = Box::leak(Box::new(0_u64));
    let data = Box::leak(vec![0_u8; data_len].into_boxed_slice());
    AccountInfo::new(key_ref, is_signer, true, lamports, data, owner_ref, false, 0)
}

#[test]
fn record_tip_writes_receipt() {
    let program_id = perbug_tipping_program::id();
    let admin = Pubkey::new_unique();
    let from = Pubkey::new_unique();
    let to = Pubkey::new_unique();
    let tip_id = "tip-1".to_string();
    let (config_key, _) = derive_config_pda(&program_id);
    let (receipt_key, _) = derive_tip_receipt_pda(&program_id, &tip_id);
    let admin_ai = account(admin, true, 0);
    let config_ai = account(config_key, false, 128);
    Processor::process(
        &program_id,
        &[admin_ai, config_ai.clone()],
        &to_vec(&TippingInstruction::InitializeConfig { admin, fee_bps: 250 }).unwrap(),
    )
    .unwrap();
    let signer_ai = account(from, true, 0);
    let receipt_ai = account(receipt_key, false, 256);
    Processor::process(
        &program_id,
        &[signer_ai, config_ai.clone(), receipt_ai.clone()],
        &to_vec(&TippingInstruction::RecordTip {
            tip_id: tip_id.clone(),
            from,
            to,
            amount_atomic: 10_000,
        })
        .unwrap(),
    )
    .unwrap();
    let receipt = TipReceipt::deserialize(&mut &receipt_ai.data.borrow()[..]).unwrap();
    assert_eq!(receipt.fee_amount_atomic, 250);
    assert_eq!(receipt.net_amount_atomic, 9_750);
}
