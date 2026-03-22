use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Debug, Error, Clone, Copy, PartialEq, Eq)]
pub enum TippingError {
    #[error("invalid instruction")]
    InvalidInstruction,
    #[error("invalid PDA")]
    InvalidPda,
    #[error("account already initialized")]
    AlreadyInitialized,
    #[error("unauthorized")]
    Unauthorized,
    #[error("program paused")]
    Paused,
    #[error("duplicate tip receipt")]
    DuplicateReceipt,
    #[error("invalid fee basis points")]
    InvalidFeeBps,
    #[error("account data too small")]
    AccountDataTooSmall,
}

impl From<TippingError> for ProgramError {
    fn from(value: TippingError) -> Self {
        ProgramError::Custom(value as u32)
    }
}
