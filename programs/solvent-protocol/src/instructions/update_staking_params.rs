use crate::common::validate_farm;
use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

pub fn update_staking_params(ctx: Context<UpdateStakingParams>) -> Result<()> {
    // Store farming related pubkeys in bucket state
    ctx.accounts.bucket_state.staking_params = Some(StakingParams {
        gembank_program: ctx.accounts.gembank_program.key(),
        gemfarm_program: ctx.accounts.gemfarm_program.key(),
        gemworks_farm: ctx.accounts.gemworks_farm.key(),
        gemworks_fee_account: ctx.accounts.gemworks_fee_account.key(),
    });

    // Emit success event
    emit!(UpdateStakingParamsEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        gembank_program: ctx.accounts.gembank_program.key(),
        gemfarm_program: ctx.accounts.gemfarm_program.key(),
        gemworks_farm: ctx.accounts.gemworks_farm.key(),
        gemworks_fee_account: ctx.accounts.gemworks_fee_account.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateStakingParams<'info> {
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
    pub bucket_state: Box<Account<'info, BucketStateV3>>,

    pub droplet_mint: Account<'info, Mint>,

    /// CHECK:
    //#[soteria(ignore_untrustful)]
    #[account(
        owner = gemfarm_program.key(),
        constraint = validate_farm(&gemworks_farm)? @ SolventError::FarmConfigInvalid
    )]
    pub gemworks_farm: UncheckedAccount<'info>,

    /// CHECK:
    //#[soteria(ignore_untrustful)]
    #[account(executable)]
    pub gembank_program: UncheckedAccount<'info>,

    /// CHECK:
    //#[soteria(ignore_untrustful)]
    #[account(executable)]
    pub gemfarm_program: UncheckedAccount<'info>,

    /// CHECK:
    //#[soteria(ignore_untrustful)]
    pub gemworks_fee_account: UncheckedAccount<'info>,

    // Solana ecosystem program addresses
    pub system_program: Program<'info, System>,
}

#[event]
pub struct UpdateStakingParamsEvent {
    pub droplet_mint: Pubkey,
    pub gembank_program: Pubkey,
    pub gemfarm_program: Pubkey,
    pub gemworks_farm: Pubkey,
    pub gemworks_fee_account: Pubkey,
}
