pub mod common;
pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use common::*;
use instructions::*;
use state::*;

declare_id!("SVTy4zMgDPExf1RaJdoCo5HvuyxrxdRsqF1uf2Rcd7J");

#[program]
pub mod solvent_protocol {

    use super::*;

    // Create a bucket for an NFT collection
    pub fn create_bucket(
        ctx: Context<CreateBucket>,
        collection_info: CollectionInfo,
    ) -> Result<()> {
        instructions::create_bucket(ctx, collection_info)
    }

    // Deposit an NFT into a bucket and get droplets in exchange
    pub fn deposit_nft(
        ctx: Context<DepositNft>,
        whitelist_proof: Option<Vec<[u8; 32]>>,
    ) -> Result<()> {
        instructions::deposit_nft(ctx, whitelist_proof)
    }

    // Burn droplets and redeem an NFT from the bucket in exchange
    pub fn redeem_nft(ctx: Context<RedeemNft>) -> Result<()> {
        instructions::redeem_nft(ctx)
    }

    // Swap an NFT for another in a bucket
    pub fn swap_nfts(ctx: Context<SwapNfts>, whitelist_proof: Option<Vec<[u8; 32]>>) -> Result<()> {
        instructions::swap_nfts(ctx, whitelist_proof)
    }

    // Lock an NFT into a locker and get droplets in exchange
    pub fn lock_nft(
        ctx: Context<LockNft>,
        duration: u64,
        whitelist_proof: Option<Vec<[u8; 32]>>,
    ) -> Result<CalculateLoanResult> {
        instructions::lock_nft(ctx, duration, whitelist_proof)
    }

    // Unlock a locked NFT from the locker by burning droplets
    pub fn unlock_nft(ctx: Context<UnlockNft>) -> Result<()> {
        instructions::unlock_nft(ctx)
    }

    // Liquidate a locked NFT position that is defaulted
    pub fn liquidate_locker(ctx: Context<LiquidateLocker>) -> Result<()> {
        instructions::liquidate_locker(ctx)
    }

    // Update the parameters for NFT locking feature
    pub fn update_locking_params(
        ctx: Context<UpdateLockingParams>,
        max_locker_duration: Option<u64>,
        interest_scaler: Option<u8>,
    ) -> Result<()> {
        instructions::update_locking_params(ctx, max_locker_duration, interest_scaler)
    }

    pub fn update_staking_params(ctx: Context<UpdateStakingParams>) -> Result<()> {
        instructions::update_staking_params(ctx)
    }

    pub fn set_locking_enabled(ctx: Context<SetLockingEnabled>, flag: bool) -> Result<()> {
        instructions::set_locking_enabled(ctx, flag)
    }

    pub fn set_staking_enabled(ctx: Context<SetStakingEnabled>, flag: bool) -> Result<()> {
        instructions::set_staking_enabled(ctx, flag)
    }

    pub fn stake_nft(ctx: Context<StakeNft>) -> Result<()> {
        instructions::stake_nft(ctx)
    }

    pub fn unstake_nft(ctx: Context<UnstakeNft>) -> Result<()> {
        instructions::unstake_nft(ctx)
    }

    // Create the migration state account
    pub fn start_migration(ctx: Context<StartMigration>) -> Result<()> {
        instructions::start_migration(ctx)
    }

    // Take old droplets from user and mint to him new droplets in exchange
    pub fn migrate_droplets(ctx: Context<MigrateDroplets>) -> Result<()> {
        instructions::migrate_droplets(ctx)
    }

    pub fn migrate_nft(
        ctx: Context<MigrateNft>,
        whitelist_proof: Option<Vec<[u8; 32]>>,
    ) -> Result<()> {
        instructions::migrate_nft(ctx, whitelist_proof)
    }

    pub fn claim_balance(ctx: Context<ClaimBalance>) -> Result<()> {
        instructions::claim_balance(ctx)
    }

    pub fn update_revenue_distribution_params(ctx: Context<UpdateRevenueDistributionParams>, revenue_partners: Vec<RevenuePartner>) -> Result<()> {
        instructions::update_revenue_distribution_params(ctx, revenue_partners)
    }
}
