use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(Debug, Clone, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub enum TippingInstruction {
    InitializeConfig { admin: Pubkey, fee_bps: u16 },
    RecordTip { tip_id: String, from: Pubkey, to: Pubkey, amount_atomic: u64 },
    RecordTipWithFee { tip_id: String, from: Pubkey, to: Pubkey, amount_atomic: u64, fee_bps: u16 },
    SetFeeBps { fee_bps: u16 },
    SetAdmin { new_admin: Pubkey },
    SetPaused { paused: bool },
}
