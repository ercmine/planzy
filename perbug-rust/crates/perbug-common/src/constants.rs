use solana_program::pubkey::Pubkey;

pub const PERBUG_TOKEN_NAME: &str = "Perbug";
pub const PERBUG_TOKEN_SYMBOL: &str = "PERBUG";
pub const PERBUG_TOKEN_DECIMALS: u8 = 6;
pub const MAX_BPS: u16 = 10_000;
pub const MAX_LABEL_LEN: usize = 64;
pub const MAX_URI_LEN: usize = 256;

pub const CONFIG_SEED: &[u8] = b"config";
pub const PLACE_SEED: &[u8] = b"place";
pub const REWARD_RECEIPT_SEED: &[u8] = b"reward_receipt";
pub const TIP_RECEIPT_SEED: &[u8] = b"tip_receipt";

pub fn token_program_candidates() -> [Pubkey; 2] {
    [spl_token::id(), spl_token_2022::id()]
}
