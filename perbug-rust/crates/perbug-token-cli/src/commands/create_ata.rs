use anyhow::{Context, Result};
use clap::Args;
use solana_sdk::pubkey::Pubkey;
use spl_associated_token_account::get_associated_token_address;

use crate::config::CliConfig;

#[derive(Debug, Args)]
pub struct CreateAtaArgs {
    #[arg(long)]
    pub mint: String,
    #[arg(long)]
    pub owner: String,
}

pub fn run(_cfg: &CliConfig, args: CreateAtaArgs) -> Result<()> {
    let mint = args.mint.parse::<Pubkey>().context("invalid mint pubkey")?;
    let owner = args.owner.parse::<Pubkey>().context("invalid owner pubkey")?;
    let ata = get_associated_token_address(&owner, &mint);

    println!("owner: {owner}");
    println!("mint: {mint}");
    println!("associated_token_account: {ata}");
    println!("Create it with: spl-token create-account {mint} --owner {owner}");
    Ok(())
}
