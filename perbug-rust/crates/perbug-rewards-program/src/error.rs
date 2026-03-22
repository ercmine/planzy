use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Debug, Error, Clone, Copy, PartialEq, Eq)]
pub enum RewardsError {
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
    #[error("duplicate reward receipt")]
    DuplicateReceipt,
    #[error("reward already claimed")]
    AlreadyClaimed,
    #[error("place not found")]
    PlaceNotFound,
    #[error("account data too small")]
    AccountDataTooSmall,
}

impl From<RewardsError> for ProgramError {
    fn from(value: RewardsError) -> Self {
        ProgramError::Custom(value as u32)
    }
}
