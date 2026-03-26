use borsh::{to_vec, BorshDeserialize};
use dryad_common::{derive_config_pda, derive_tip_receipt_pda};
use dryad_tipping_program::{
    error::TippingError, instruction::TippingInstruction, processor::Processor, state::TipReceipt,
};
use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};

fn account<'a>(key: Pubkey, is_signer: bool, data_len: usize) -> AccountInfo<'a> {
    let key_ref = Box::leak(Box::new(key));
    let owner_ref = Box::leak(Box::new(dryad_tipping_program::id()));
    let lamports = Box::leak(Box::new(0_u64));
    let data = Box::leak(vec![0_u8; data_len].into_boxed_slice());
    AccountInfo::new(key_ref, is_signer, true, lamports, data, owner_ref, false, 0)
}

#[test]
fn fee_override_and_duplicates_are_validated() {
    let program_id = dryad_tipping_program::id();
    let admin = Pubkey::new_unique();
    let from = Pubkey::new_unique();
    let to = Pubkey::new_unique();
    let tip_id = "tip-dup".to_string();
    let (config_key, _) = derive_config_pda(&program_id);
    let (receipt_key, _) = derive_tip_receipt_pda(&program_id, &tip_id);
    let admin_ai = account(admin, true, 0);
    let config_ai = account(config_key, false, 128);
    Processor::process(
        &program_id,
        &[admin_ai, config_ai.clone()],
        &to_vec(&TippingInstruction::InitializeConfig { admin, fee_bps: 100 }).unwrap(),
    )
    .unwrap();
    let signer_ai = account(from, true, 0);
    let receipt_ai = account(receipt_key, false, 256);
    let data = to_vec(&TippingInstruction::RecordTipWithFee {
        tip_id: tip_id.clone(),
        from,
        to,
        amount_atomic: 20_000,
        fee_bps: 500,
    })
    .unwrap();
    Processor::process(
        &program_id,
        &[signer_ai.clone(), config_ai.clone(), receipt_ai.clone()],
        &data,
    )
    .unwrap();
    let receipt = TipReceipt::deserialize(&mut &receipt_ai.data.borrow()[..]).unwrap();
    assert_eq!(receipt.fee_amount_atomic, 1_000);
    let dup =
        Processor::process(&program_id, &[signer_ai, config_ai.clone(), receipt_ai.clone()], &data)
            .unwrap_err();
    assert_eq!(dup, ProgramError::Custom(TippingError::DuplicateReceipt as u32));
    let invalid = Processor::process(
        &program_id,
        &[account(from, true, 0), config_ai, account(Pubkey::new_unique(), false, 256)],
        &to_vec(&TippingInstruction::RecordTipWithFee {
            tip_id: "tip-bad".into(),
            from,
            to,
            amount_atomic: 1,
            fee_bps: 10_001,
        })
        .unwrap(),
    )
    .unwrap_err();
    assert_eq!(invalid, ProgramError::Custom(TippingError::InvalidFeeBps as u32));
}
