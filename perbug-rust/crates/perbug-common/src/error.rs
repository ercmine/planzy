use thiserror::Error;

#[derive(Debug, Error, Clone, PartialEq, Eq)]
pub enum DryadError {
    #[error("arithmetic overflow")]
    ArithmeticOverflow,
    #[error("invalid amount format")]
    InvalidAmountFormat,
    #[error("amount has too many decimal places")]
    TooManyDecimalPlaces,
    #[error("basis points out of range")]
    InvalidBasisPoints,
}
