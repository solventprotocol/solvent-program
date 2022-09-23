use crate::common::*;
use crate::constants::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

// Create a bucket for an NFT collection
pub fn create_bucket(ctx: Context<CreateBucket>, collection_info: CollectionInfo) -> Result<()> {
    // Make sure collection info is valid
    validate_collection_info(&collection_info)?;

    // Update BucketState account with information
    **ctx.accounts.bucket_state = BucketStateV3 {
        bump: *ctx.bumps.get("bucket_state").unwrap(),
        droplet_mint: ctx.accounts.droplet_mint.key(),
        collection_info: collection_info.clone(),
        // Counters
        num_nfts_in_bucket: 0,
        num_nfts_in_lockers: 0,
        // Locker related params
        is_locking_enabled: false,
        max_locker_duration: 0,
        interest_scaler: 0,
        // NFT staking related params
        is_staking_enabled: false,
        staking_params: None,
    };

    // Emit success event
    emit!(CreateBucketEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        signer: ctx.accounts.signer.key(),
        collection_info
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CreateBucket<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [SOLVENT_AUTHORITY_SEED.as_bytes()],
        bump,
    )]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub solvent_authority: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = [
            droplet_mint.key.as_ref(),
            BUCKET_SEED.as_bytes()
        ],
        payer = signer,
        space = BucketStateV3::LEN,
        bump
    )]
    pub bucket_state: Box<Account<'info, BucketStateV3>>,

    #[account(
        init,
        mint::decimals = 8,
        mint::authority = solvent_authority,
        payer = signer
    )]
    pub droplet_mint: Account<'info, Mint>,

    // Solana ecosystem program addresses
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct CreateBucketEvent {
    pub signer: Pubkey,
    pub droplet_mint: Pubkey,
    pub collection_info: CollectionInfo,
}
