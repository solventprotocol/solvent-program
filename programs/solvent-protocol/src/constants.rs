use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;

// Numbers
pub const LAMPORTS_PER_DROPLET: u64 = 100000000;
pub const MAX_INTEREST_SCALER: u8 = 100;
pub const LIQUIDATION_REWARD_PERCENTAGE: u8 = 20;
pub const DROPLETS_PER_NFT: u8 = 100;
pub const REDEEM_FEE_BASIS_POINTS: u8 = 200;
pub const SWAP_FEE_BASIS_POINTS: u8 = 50;
pub const DISTRIBUTOR_FEE_BASIS_POINTS: u16 = 1000;
pub const SELLER_FEE_BASIS_POINTS_THRESHOLD_FOR_BAN: u16 = 9500;

// Seed strings
pub const SOLVENT_AUTHORITY_SEED: &str = "authority-seed";
pub const FARMER_AUTHORITY_SEED: &str = "farmer-authority-seed";
pub const BUCKET_SEED: &str = "bucket-seed-v3";
pub const LOCKER_SEED: &str = "locker-seed";
pub const DEPOSIT_SEED: &str = "deposit-seed";
pub const SWAP_SEED: &str = "swap-seed";
pub const GEMWORKS_FARMER_SEED: &str = "farmer";
pub const GEMWORKS_VAULT_SEED: &str = "vault";
pub const GEMWORKS_GEM_BOX_SEED: &str = "gem_box";
pub const GEMWORKS_GDR_SEED: &str = "gem_deposit_receipt";
pub const GEMWORKS_GEM_RARITY_SEED: &str = "gem_rarity";
pub const GEMWORKS_FARM_TREASURY_SEED: &str = "treasury";
pub const GEMWORKS_REWARD_POT_SEED: &str = "reward_pot";
// TODO: To remove after migration is done
pub const MIGRATION_SEED: &str = "migration-seed";

// Pubkeys
pub const SOLVENT_CORE_TREASURY: Pubkey = pubkey!("45nueWN9Qwn5vDBmJGBLEsYvaJG6vrNmNdCyrntXDk2K");
pub const SOLVENT_LOCKERS_TREASURY: Pubkey =
    pubkey!("HkjFiwUW7qnREVm2PxBg8LUrCvjExrJjyYY51wsZTUK8");

#[cfg(feature = "test-ids")]
pub const SOLVENT_MIGRATION_CRANK: Pubkey = pubkey!("DPnNwkEzRLxeL1k3ftkSYNgbUDaWyi37VQArW56v8xok");
#[cfg(not(feature = "test-ids"))]
pub const SOLVENT_MIGRATION_CRANK: Pubkey = pubkey!("Hr4eSwCbeaFL1DVVDwPx18DGgnfQmYX6VkbXk66mYnnn");

#[cfg(feature = "test-ids")]
pub const SOLVENT_ADMIN: Pubkey = pubkey!("DPnNwkEzRLxeL1k3ftkSYNgbUDaWyi37VQArW56v8xok");
#[cfg(not(feature = "test-ids"))]
pub const SOLVENT_ADMIN: Pubkey = pubkey!("DYJXfxaci8NzfkHRZ87Ycfwp1CMMwssXcKeN8hWTbons");
