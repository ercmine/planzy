use anyhow::{Context, Result};
use clap::Args;
use solana_sdk::pubkey::Pubkey;
use spl_associated_token_account::get_associated_token_address;

use crate::config::CliConfig;

#[derive(Debug, Args)]
pub struct TreasuryArgs {
    #[arg(long)]
    pub mint: String,
    #[arg(long)]
    pub owner: String,
}

pub fn run(cfg: &CliConfig, args: TreasuryArgs) -> Result<()> {
    let mint = args.mint.parse::<Pubkey>().context("invalid mint pubkey")?;
    let owner = args.owner.parse::<Pubkey>().context("invalid owner pubkey")?;
    let ata = get_associated_token_address(&owner, &mint);
    let balance = cfg.rpc.get_token_account_balance(&ata).ok();

    println!("treasury_owner: {owner}");
    println!("treasury_ata: {ata}");
    match balance {
        Some(balance) => {
            println!("ui_amount: {}", balance.ui_amount_string);
            println!("raw_amount: {}", balance.amount);
        }
        None => println!("account not found yet on RPC; create the ATA first"),
    }
    Ok(())
}
