mod commands;
mod config;

use anyhow::Result;
use clap::{Parser, Subcommand};
use commands::{create_ata, create_mint, inspect, mint_to, treasury};
use config::CliConfig;

#[derive(Debug, Parser)]
#[command(name = "dryad-token-cli", about = "Dryad SPL token operations CLI")]
struct Cli {
    #[arg(long, env = "SOLANA_RPC_URL")]
    rpc_url: Option<String>,
    #[arg(long, env = "SOLANA_KEYPAIR")]
    keypair: Option<String>,
    #[arg(long, default_value = "confirmed")]
    commitment: String,
    #[arg(long)]
    config: Option<String>,
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    CreateMint(create_mint::CreateMintArgs),
    CreateAta(create_ata::CreateAtaArgs),
    MintTo(mint_to::MintToArgs),
    TreasuryInfo(treasury::TreasuryArgs),
    InspectMint(inspect::InspectMintArgs),
    InspectAccount(inspect::InspectAccountArgs),
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let cfg = CliConfig::load(cli.rpc_url, cli.keypair, &cli.commitment, cli.config.as_deref())?;

    match cli.command {
        Command::CreateMint(args) => create_mint::run(&cfg, args),
        Command::CreateAta(args) => create_ata::run(&cfg, args),
        Command::MintTo(args) => mint_to::run(&cfg, args),
        Command::TreasuryInfo(args) => treasury::run(&cfg, args),
        Command::InspectMint(args) => inspect::run_inspect_mint(&cfg, args),
        Command::InspectAccount(args) => inspect::run_inspect_account(&cfg, args),
    }
}
