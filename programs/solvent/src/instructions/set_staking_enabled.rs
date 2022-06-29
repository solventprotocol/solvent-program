use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

// Update the parameters for an NFT locker
pub fn set_staking_enabled(ctx: Context<SetStakingEnabled>, flag: bool) -> Result<()> {
    ctx.accounts.bucket_state.is_staking_enabled = flag;

    // Emit success event
    emit!(SetStakingEnabledEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        signer: ctx.accounts.signer.key(),
        flag
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SetStakingEnabled<'info> {
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
}

#[event]
pub struct SetStakingEnabledEvent {
    pub signer: Pubkey,
    pub droplet_mint: Pubkey,
    pub flag: bool,
}
