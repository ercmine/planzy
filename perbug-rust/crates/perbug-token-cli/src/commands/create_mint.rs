use anyhow::Result;
use clap::Args;

use crate::config::CliConfig;

#[derive(Debug, Args)]
pub struct CreateMintArgs {
    #[arg(long, default_value_t = dryad_common::DRYAD_TOKEN_DECIMALS)]
    pub decimals: u8,
    #[arg(long)]
    pub token_2022: bool,
}

pub fn run(cfg: &CliConfig, args: CreateMintArgs) -> Result<()> {
    let _ = cfg;
    let program = if args.token_2022 { "spl-token-2022" } else { "spl-token" };
    println!(
        "Create mint scaffolding is available. Run `{program} create-token --decimals {}` with payer {}.",
        args.decimals,
        cfg.payer_pubkey()
    );
    println!("This CLI intentionally avoids shelling out automatically so that mint authority decisions stay explicit.");
    Ok(())
}
