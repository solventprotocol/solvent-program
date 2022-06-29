use crate::common::CollectionInfo;
use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

// Create a bucket for an NFT collection
pub fn create_bucket(ctx: Context<CreateBucket>, collection_info: CollectionInfo) -> Result<()> {
    match collection_info {
        CollectionInfo::V1 {
            ref symbol,
            ref verified_creators,
            whitelist_root: _,
        } => {
            // Check if symbol is too long
            require!(
                // Max string length is 8, so UTF-8 encoded max byte length is 32
                symbol.len() <= 8 * 4,
                SolventError::CollectionSymbolInvalid
            );

            // Check if there are 1-5 verified creators
            require!(
                !verified_creators.is_empty() && verified_creators.len() <= 5,
                SolventError::VerifiedCreatorsInvalid
            )
        }
        CollectionInfo::V2 { collection_mint: _ } => {}
    };

    // Update BucketState account with information
    **ctx.accounts.bucket_state = BucketStateV3 {
        bump: *ctx.bumps.get("bucket_state").unwrap(),
        droplet_mint: ctx.accounts.droplet_mint.key(),
        collection_info,
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
        signer: ctx.accounts.signer.key()
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
}
