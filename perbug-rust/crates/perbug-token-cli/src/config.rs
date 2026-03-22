use std::{fs, path::Path};

use anyhow::{anyhow, Context, Result};
use serde::Deserialize;
use solana_rpc_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{read_keypair_file, Keypair, Signer},
};

#[derive(Debug, Default, Deserialize)]
struct FileConfig {
    rpc_url: Option<String>,
    keypair: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct EnvConfig {
    solana_rpc_url: Option<String>,
    solana_keypair: Option<String>,
}

pub struct CliConfig {
    pub rpc: RpcClient,
    pub payer: Keypair,
    pub commitment: CommitmentConfig,
}

impl CliConfig {
    pub fn load(
        rpc_url_flag: Option<String>,
        keypair_flag: Option<String>,
        commitment: &str,
        file_path: Option<&str>,
    ) -> Result<Self> {
        let file_cfg = file_path.map(load_file_config).transpose()?.unwrap_or_default();
        let env_cfg: EnvConfig = envy::from_env().unwrap_or_default();

        let rpc_url = rpc_url_flag
            .or(file_cfg.rpc_url)
            .or(env_cfg.solana_rpc_url)
            .ok_or_else(|| anyhow!("missing RPC URL; pass --rpc-url or set SOLANA_RPC_URL"))?;

        let keypair_path = keypair_flag
            .or(file_cfg.keypair)
            .or(env_cfg.solana_keypair)
            .ok_or_else(|| anyhow!("missing keypair; pass --keypair or set SOLANA_KEYPAIR"))?;

        let payer = read_keypair_file(&keypair_path)
            .map_err(|err| anyhow!("failed to read keypair {}: {}", keypair_path, err))?;

        let commitment = match commitment {
            "processed" => CommitmentConfig::processed(),
            "confirmed" => CommitmentConfig::confirmed(),
            "finalized" => CommitmentConfig::finalized(),
            other => return Err(anyhow!("unsupported commitment level: {other}")),
        };

        let rpc = RpcClient::new_with_commitment(rpc_url, commitment);
        Ok(Self { rpc, payer, commitment })
    }

    pub fn payer_pubkey(&self) -> Pubkey {
        self.payer.pubkey()
    }
}

fn load_file_config(path: &str) -> Result<FileConfig> {
    let raw = fs::read_to_string(path).with_context(|| format!("reading config file {path}"))?;
    let ext = Path::new(path).extension().and_then(|ext| ext.to_str()).unwrap_or_default();
    if ext.eq_ignore_ascii_case("json") {
        serde_json::from_str(&raw).with_context(|| format!("parsing json config {path}"))
    } else {
        Err(anyhow!("unsupported config file format for {path}; use .json"))
    }
}
