use anyhow::{Context, Result};
use clap::Args;
use solana_sdk::pubkey::Pubkey;

use crate::config::CliConfig;
use dryad_common::DryadAmount;

#[derive(Debug, Args)]
pub struct MintToArgs {
    #[arg(long)]
    pub mint: String,
    #[arg(long)]
    pub recipient: String,
    #[arg(long)]
    pub amount: String,
}

pub fn run(cfg: &CliConfig, args: MintToArgs) -> Result<()> {
    let mint = args.mint.parse::<Pubkey>().context("invalid mint pubkey")?;
    let recipient = args.recipient.parse::<Pubkey>().context("invalid recipient pubkey")?;
    let amount = DryadAmount::from_display_str(&args.amount).context("invalid amount")?;
    println!("payer: {}", cfg.payer_pubkey());
    println!("mint: {mint}");
    println!("recipient owner: {recipient}");
    println!("amount: {} DRYAD ({} atomic units)", amount, amount.atomic());
    println!(
        "Use spl-token mint {mint} {} {recipient} after verifying destination ATA.",
        amount.format_display()
    );
    Ok(())
}
