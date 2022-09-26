use crate::common::*;
use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

// Update NFT collection info of a bucket
pub fn update_collection_info(
    ctx: Context<UpdateCollectionInfo>,
    collection_info: CollectionInfo,
) -> Result<()> {
    // Make sure collection info is valid
    validate_collection_info(&collection_info)?;

    // Update BucketState account with new collection info
    ctx.accounts.bucket_state.collection_info = collection_info.clone();

    // Emit success event
    emit!(UpdateCollectionInfoEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        collection_info
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateCollectionInfo<'info> {
    #[account(address = SOLVENT_ADMIN @ SolventError::AdminAccessUnauthorized)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            droplet_mint.key().as_ref(),
            BUCKET_SEED.as_bytes()
        ],
        bump = bucket_state.bump,
        has_one = droplet_mint
    )]
    pub bucket_state: Account<'info, BucketStateV3>,

    pub droplet_mint: Account<'info, Mint>,

    // Solana ecosystem program addresses
    pub system_program: Program<'info, System>,
}

#[event]
pub struct UpdateCollectionInfoEvent {
    pub droplet_mint: Pubkey,
    pub collection_info: CollectionInfo,
}
