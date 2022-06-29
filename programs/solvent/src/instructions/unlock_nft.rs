use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::{get_associated_token_address, AssociatedToken};
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

// Unlock a locked NFT from the locker by burning droplets
pub fn unlock_nft(ctx: Context<UnlockNft>) -> Result<()> {
    let clock: Clock = Clock::get().unwrap();

    // Verify that the loan has not defaulted
    require!(
        clock.unix_timestamp as u64
            <= ctx
                .accounts
                .locker_state
                .creation_timestamp
                .checked_add(ctx.accounts.locker_state.duration)
                .unwrap(),
        SolventError::LockerExpired
    );

    // Calculate interest amount
    let interest = ((clock.unix_timestamp as u64)
        .checked_sub(ctx.accounts.locker_state.creation_timestamp)
        .unwrap())
    .checked_mul(ctx.accounts.locker_state.max_interest_payable)
    .unwrap()
    .checked_div(ctx.accounts.locker_state.duration)
    .unwrap();

    // Ensure user has enough droplets
    require!(
        ctx.accounts.signer_droplet_account.amount
            >= ctx
                .accounts
                .locker_state
                .principal_amount
                .checked_add(interest)
                .unwrap(),
        SolventError::DropletsInsufficient
    );

    // Burn droplets from the signer's account
    let burn_droplets_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Burn {
            mint: ctx.accounts.droplet_mint.to_account_info().clone(),
            from: ctx
                .accounts
                .signer_droplet_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.signer.to_account_info().clone(),
        },
    );
    token::burn(
        burn_droplets_ctx,
        ctx.accounts.locker_state.principal_amount as u64,
    )?;

    // Transfer interest from the depositor's account to the Solvent treasury
    let transfer_droplets_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Transfer {
            from: ctx
                .accounts
                .signer_droplet_account
                .to_account_info()
                .clone(),
            to: ctx
                .accounts
                .solvent_treasury_droplet_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.signer.to_account_info().clone(),
        },
    );
    token::transfer(transfer_droplets_ctx, interest as u64)?;

    // Get Solvent authority signer seeds
    let solvent_authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let solvent_authority_seeds = &[SOLVENT_AUTHORITY_SEED.as_bytes(), &[solvent_authority_bump]];
    let solvent_authority_signer_seeds = &[&solvent_authority_seeds[..]];

    // Transfer NFT to destination account
    let transfer_nft_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Transfer {
            from: ctx.accounts.solvent_token_account.to_account_info().clone(),
            to: ctx
                .accounts
                .destination_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::transfer(transfer_nft_ctx, 1)?;

    // Close locker's NFT token account to reclaim lamports
    let close_nft_token_account_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::CloseAccount {
            account: ctx.accounts.solvent_token_account.to_account_info().clone(),
            destination: ctx.accounts.signer.to_account_info().clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::close_account(close_nft_token_account_ctx)?;

    // Decrement counter
    ctx.accounts.bucket_state.num_nfts_in_lockers = ctx
        .accounts
        .bucket_state
        .num_nfts_in_lockers
        .checked_sub(1)
        .unwrap();

    // Emit success event
    emit!(UnlockNftEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        signer: ctx.accounts.signer.key(),
        destination_token_account: ctx.accounts.destination_token_account.key(),
        signer_droplet_account: ctx.accounts.signer_droplet_account.key(),
        solvent_treasury: ctx.accounts.solvent_treasury.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UnlockNft<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            droplet_mint.key().as_ref(),
            nft_mint.key().as_ref(),
            LOCKER_SEED.as_bytes()
        ],
        bump = locker_state.bump,
        close = signer,
        constraint = locker_state.depositor == signer.key() @ SolventError::LockerAccessUnauthorized,
        has_one = droplet_mint,
        has_one = nft_mint
    )]
    pub locker_state: Account<'info, LockerState>,

    #[account(
        seeds = [SOLVENT_AUTHORITY_SEED.as_bytes()],
        bump,
    )]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub solvent_authority: UncheckedAccount<'info>,

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

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = get_associated_token_address(solvent_authority.key, &nft_mint.key()),
    )]
    pub solvent_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = signer_droplet_account.mint == droplet_mint.key()
    )]
    pub signer_droplet_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = destination_token_account.mint == nft_mint.key()
    )]
    pub destination_token_account: Box<Account<'info, TokenAccount>>,

    #[account(address = SOLVENT_TREASURY @ SolventError::SolventTreasuryInvalid)]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub solvent_treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = droplet_mint,
        associated_token::authority = solvent_treasury,
    )]
    pub solvent_treasury_droplet_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub droplet_mint: Account<'info, Mint>,

    // Solana ecosystem program addresses
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct UnlockNftEvent {
    pub signer: Pubkey,
    pub nft_mint: Pubkey,
    pub droplet_mint: Pubkey,
    pub signer_droplet_account: Pubkey,
    pub destination_token_account: Pubkey,
    pub solvent_treasury: Pubkey,
}
