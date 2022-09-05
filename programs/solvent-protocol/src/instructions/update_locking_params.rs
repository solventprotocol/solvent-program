use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

// Update the parameters for an NFT locker
pub fn update_locking_params(
    ctx: Context<UpdateLockingParams>,
    max_locker_duration: Option<u64>,
    interest_scaler: Option<u8>,
) -> Result<()> {
    // Update locking params if they are supplied

    if let Some(interest_scaler) = interest_scaler {
        // Ensure interest_scaler is smaller than the max value
        require!(
            interest_scaler <= MAX_INTEREST_SCALER,
            SolventError::InterestScalerInvalid
        );
        ctx.accounts.bucket_state.interest_scaler = interest_scaler;
    }

    if let Some(max_locker_duration) = max_locker_duration {
        ctx.accounts.bucket_state.max_locker_duration = max_locker_duration;
    }

    // Emit success event
    emit!(UpdateLockingParamsEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        max_locker_duration,
        interest_scaler,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateLockingParams<'info> {
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
pub struct UpdateLockingParamsEvent {
    pub droplet_mint: Pubkey,
    pub max_locker_duration: Option<u64>,
    pub interest_scaler: Option<u8>,
}
