use crate::common::CollectionInfo;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy)]
pub struct StakingParams {
    pub gembank_program: Pubkey,
    pub gemfarm_program: Pubkey,
    pub gemworks_farm: Pubkey,
    pub gemworks_fee_account: Pubkey,
}

impl StakingParams {
    // 4 Pubkeys
    pub const LEN: usize = 4 * 32;
}

// BucketStateV3 is a PDA of droplet_mint and "bucket-seed-v3"
#[account]
pub struct BucketStateV3 {
    // Basic information about the bucket
    pub bump: u8,
    pub droplet_mint: Pubkey,
    pub collection_info: CollectionInfo,

    // NFT lockers feature related params
    pub is_locking_enabled: bool,
    pub max_locker_duration: u64,
    pub interest_scaler: u8,

    // Counters
    pub num_nfts_in_bucket: u16,
    pub num_nfts_in_lockers: u16,

    // NFT staking related params
    pub is_staking_enabled: bool,
    // Either all of the 5 pubkeys should be there, or none of them
    pub staking_params: Option<StakingParams>,
}

impl BucketStateV3 {
    pub const LEN: usize =
        // Discriminator, 1 Pubkey, 1 CollectionInfo, 2 bools, 1 u64, 2 u16s, 1 u8 + 1 Option<FarmingParams>
        8 + 32 + CollectionInfo::LEN + 2 + 8 + (2 * 2) + 1 + (1 + StakingParams::LEN);
}

// LockerState is a PDA of droplet_mint, nft_mint, and "locker-seed"
#[account]
pub struct LockerState {
    pub bump: u8,

    // Droplet mint associated with the collection
    pub droplet_mint: Pubkey,

    // User depositing NFT
    pub depositor: Pubkey,

    // NFT mint account
    pub nft_mint: Pubkey,

    // Timestamp of NFT deposit and locker creation
    pub creation_timestamp: u64,

    // Locker duration in seconds
    pub duration: u64,

    // The pricipal amout of the loan in droplet lamports
    pub principal_amount: u64,

    // Max interest payable in droplet lamports
    pub max_interest_payable: u64,
}

impl LockerState {
    // Discriminator, 1 u8, 3 Pubkeys, 4 u64s
    pub const LEN: usize = 8 + 1 + (3 * 32) + (4 * 8);
}

// DepositState is a PDA of droplet_mint, nft_mint, and "deposit-seed"
#[account]
pub struct DepositState {
    pub bump: u8,
    pub droplet_mint: Pubkey,
    pub nft_mint: Pubkey,
}

impl DepositState {
    // Discriminator, 1 u8, 2 Pubkeys
    pub const LEN: usize = 8 + 1 + (2 * 32);
}

// TODO: To remove after migration is done
// MigrationState is a PDA of droplet_mint, and "migration-seed"
#[account]
pub struct MigrationState {
    pub bump: u8,
    pub droplet_mint_new: Pubkey,
    pub droplet_mint_old: Pubkey,
}

impl MigrationState {
    // Discriminator, 1 u8, 2 Pubkeys
    pub const LEN: usize = 8 + 1 + (2 * 32);
}

#[account]
pub struct SwapState {
    pub bump: u8,
    pub signer: Pubkey,
    pub flag: bool,
}

impl SwapState {
    // Discriminator, 1 u8, 1 Pubkey, 1 bool
    pub const LEN: usize = 8 + 1 + 32 + 1;
}
