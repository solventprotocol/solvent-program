// TODO: To remove after migration is done

use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

// Take old droplets from user and mint to him new droplets in exchange
pub fn migrate_droplets(ctx: Context<MigrateDroplets>) -> Result<()> {
    let droplets_to_migrate = ctx.accounts.signer_droplet_token_account_old.amount;

    // Transfer old droplets from signer's account to the treasury account
    let transfer_droplets_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Transfer {
            from: ctx
                .accounts
                .signer_droplet_token_account_old
                .to_account_info()
                .clone(),
            to: ctx
                .accounts
                .solvent_migration_crank_droplet_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.signer.to_account_info().clone(),
        },
    );
    token::transfer(transfer_droplets_ctx, droplets_to_migrate)?;

    // Get Solvent authority signer seeds
    let solvent_authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let solvent_authority_seeds = &[SOLVENT_AUTHORITY_SEED.as_bytes(), &[solvent_authority_bump]];
    let solvent_authority_signer_seeds = &[&solvent_authority_seeds[..]];

    // Mint droplets to destination account
    let mint_droplets_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::MintTo {
            mint: ctx.accounts.droplet_mint_new.to_account_info().clone(),
            to: ctx
                .accounts
                .signer_droplet_token_account_new
                .to_account_info()
                .clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::mint_to(mint_droplets_ctx, droplets_to_migrate)?;

    // Emit success event
    emit!(MigrateDropletsEvent {
        droplet_mint_old: ctx.accounts.droplet_mint_old.key(),
        droplet_mint_new: ctx.accounts.droplet_mint_new.key(),
        signer_droplet_token_account_old: ctx.accounts.signer_droplet_token_account_old.key(),
        signer_droplet_token_account_new: ctx.accounts.signer_droplet_token_account_new.key(),
        signer: ctx.accounts.signer.key(),
        droplet_amount_migrated: droplets_to_migrate
    });

    Ok(())
}

#[derive(Accounts)]
pub struct MigrateDroplets<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [SOLVENT_AUTHORITY_SEED.as_bytes()],
        bump,
    )]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub solvent_authority: UncheckedAccount<'info>,

    #[account(address = SOLVENT_MIGRATION_CRANK @ SolventError::SolventMigrationCrankInvalid)]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub solvent_migration_crank: UncheckedAccount<'info>,

    #[account(
        seeds = [
            droplet_mint_new.key().as_ref(),
            MIGRATION_SEED.as_bytes()
        ],
        bump,
        has_one = droplet_mint_old,
        has_one = droplet_mint_new
    )]
    pub migration_state: Account<'info, MigrationState>,

    pub droplet_mint_old: Account<'info, Mint>,

    #[account(
        mut,
        constraint = signer_droplet_token_account_old.mint == droplet_mint_old.key()
    )]
    pub signer_droplet_token_account_old: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub droplet_mint_new: Account<'info, Mint>,

    #[account(
        mut,
        constraint = signer_droplet_token_account_new.mint == droplet_mint_new.key()
    )]
    pub signer_droplet_token_account_new: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = droplet_mint_old,
        associated_token::authority = solvent_migration_crank,
    )]
    pub solvent_migration_crank_droplet_token_account: Box<Account<'info, TokenAccount>>,

    // Solana ecosystem program addresses
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct MigrateDropletsEvent {
    pub signer: Pubkey,
    pub droplet_mint_old: Pubkey,
    pub droplet_mint_new: Pubkey,
    pub signer_droplet_token_account_old: Pubkey,
    pub signer_droplet_token_account_new: Pubkey,
    pub droplet_amount_migrated: u64,
}
