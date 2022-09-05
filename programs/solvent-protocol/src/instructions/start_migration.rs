// TODO: To remove after migration is done

use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

// Create the migration state account
pub fn start_migration(ctx: Context<StartMigration>) -> Result<()> {
    // Set MigrationState account contents
    *ctx.accounts.migration_state = MigrationState {
        bump: *ctx.bumps.get("migration_state").unwrap(),
        droplet_mint_old: ctx.accounts.droplet_mint_old.key(),
        droplet_mint_new: ctx.accounts.droplet_mint_new.key(),
    };

    // Emit success event
    emit!(StartMigrationEvent {
        droplet_mint_old: ctx.accounts.droplet_mint_old.key(),
        droplet_mint_new: ctx.accounts.droplet_mint_new.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct StartMigration<'info> {
    #[account(mut, address = SOLVENT_ADMIN @ SolventError::AdminAccessUnauthorized)]
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
            droplet_mint_new.key().as_ref(),
            MIGRATION_SEED.as_bytes()
        ],
        bump,
        payer = signer,
        space = MigrationState::LEN,
    )]
    pub migration_state: Account<'info, MigrationState>,

    pub droplet_mint_old: Account<'info, Mint>,

    #[account(constraint = droplet_mint_new.mint_authority.unwrap() == solvent_authority.key())]
    pub droplet_mint_new: Account<'info, Mint>,

    // Solana ecosystem program addresses
    pub system_program: Program<'info, System>,
}

#[event]
pub struct StartMigrationEvent {
    pub droplet_mint_old: Pubkey,
    pub droplet_mint_new: Pubkey,
}
