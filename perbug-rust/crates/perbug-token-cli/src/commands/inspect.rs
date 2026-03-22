use anyhow::{Context, Result};
use clap::Args;
use solana_sdk::program_pack::Pack;
use solana_sdk::pubkey::Pubkey;

use crate::config::CliConfig;

#[derive(Debug, Args)]
pub struct InspectMintArgs {
    #[arg(long)]
    pub mint: String,
}

#[derive(Debug, Args)]
pub struct InspectAccountArgs {
    #[arg(long)]
    pub account: String,
}

pub fn run_inspect_mint(cfg: &CliConfig, args: InspectMintArgs) -> Result<()> {
    let mint = args.mint.parse::<Pubkey>().context("invalid mint pubkey")?;
    let account = cfg.rpc.get_account(&mint)?;
    println!("mint: {mint}");
    println!("owner program: {}", account.owner);
    println!("lamports: {}", account.lamports);
    println!("data_len: {}", account.data.len());
    let mint_state = spl_token::state::Mint::unpack(&account.data)
        .context("unable to parse SPL mint account")?;
    println!("supply: {}", mint_state.supply);
    println!("decimals: {}", mint_state.decimals);
    println!("mint_authority: {:?}", mint_state.mint_authority);
    println!("freeze_authority: {:?}", mint_state.freeze_authority);
    Ok(())
}

pub fn run_inspect_account(cfg: &CliConfig, args: InspectAccountArgs) -> Result<()> {
    let account_pubkey = args.account.parse::<Pubkey>().context("invalid account pubkey")?;
    let account = cfg.rpc.get_account(&account_pubkey)?;
    println!("account: {account_pubkey}");
    println!("owner program: {}", account.owner);
    println!("lamports: {}", account.lamports);
    println!("data_len: {}", account.data.len());
    if let Ok(token_account) = spl_token::state::Account::unpack(&account.data) {
        println!("token mint: {}", token_account.mint);
        println!("token owner: {}", token_account.owner);
        println!("amount: {}", token_account.amount);
        println!("delegate: {:?}", token_account.delegate);
        println!("state: {:?}", token_account.state);
    }
    Ok(())
}
