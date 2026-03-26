use std::{fmt, str::FromStr};

use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};

use crate::{constants::DRYAD_TOKEN_DECIMALS, error::DryadError};

#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Serialize,
    Deserialize,
    BorshSerialize,
    BorshDeserialize,
)]
pub struct DryadAmount {
    atomic: u64,
}

impl DryadAmount {
    pub const fn from_atomic(atomic: u64) -> Self {
        Self { atomic }
    }

    pub const fn atomic(self) -> u64 {
        self.atomic
    }

    pub fn from_display_str(value: &str) -> Result<Self, DryadError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err(DryadError::InvalidAmountFormat);
        }

        let (whole_part, fractional_part) = match trimmed.split_once('.') {
            Some((whole, fraction)) => (whole, fraction),
            None => (trimmed, ""),
        };

        let whole = u64::from_str(whole_part).map_err(|_| DryadError::InvalidAmountFormat)?;
        let factor = 10_u64.pow(DRYAD_TOKEN_DECIMALS as u32);
        let whole_atomic = whole.checked_mul(factor).ok_or(DryadError::ArithmeticOverflow)?;

        if fractional_part.len() > DRYAD_TOKEN_DECIMALS as usize {
            return Err(DryadError::TooManyDecimalPlaces);
        }
        let mut fraction = fractional_part.to_string();
        while fraction.len() < DRYAD_TOKEN_DECIMALS as usize {
            fraction.push('0');
        }
        let frac_atomic = if fraction.is_empty() {
            0
        } else {
            u64::from_str(&fraction).map_err(|_| DryadError::InvalidAmountFormat)?
        };

        Ok(Self {
            atomic: whole_atomic.checked_add(frac_atomic).ok_or(DryadError::ArithmeticOverflow)?,
        })
    }

    pub fn format_display(self) -> String {
        let factor = 10_u64.pow(DRYAD_TOKEN_DECIMALS as u32);
        let whole = self.atomic / factor;
        let frac = self.atomic % factor;
        if frac == 0 {
            return whole.to_string();
        }
        let mut frac_str = format!("{:0width$}", frac, width = DRYAD_TOKEN_DECIMALS as usize);
        while frac_str.ends_with('0') {
            frac_str.pop();
        }
        format!("{}.{}", whole, frac_str)
    }
}

impl fmt::Display for DryadAmount {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.format_display())
    }
}

pub fn checked_add_u64(lhs: u64, rhs: u64) -> Result<u64, DryadError> {
    lhs.checked_add(rhs).ok_or(DryadError::ArithmeticOverflow)
}

pub fn checked_sub_u64(lhs: u64, rhs: u64) -> Result<u64, DryadError> {
    lhs.checked_sub(rhs).ok_or(DryadError::ArithmeticOverflow)
}

pub fn checked_mul_u64(lhs: u64, rhs: u64) -> Result<u64, DryadError> {
    lhs.checked_mul(rhs).ok_or(DryadError::ArithmeticOverflow)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_display_amount() {
        let amount = DryadAmount::from_display_str("42.1234").expect("amount");
        assert_eq!(amount.atomic(), 42_123_400);
        assert_eq!(amount.to_string(), "42.1234");
    }

    #[test]
    fn rejects_too_many_decimals() {
        let err = DryadAmount::from_display_str("1.1234567").expect_err("expected decimal error");
        assert_eq!(err, DryadError::TooManyDecimalPlaces);
    }
}
