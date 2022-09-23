use crate::constants::*;
use crate::errors::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;

// Claim the SOL balance of solvent-authority
pub fn claim_balance(ctx: Context<ClaimBalance>) -> Result<()> {
    // Get Solvent authority signer seeds
    let solvent_authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let solvent_authority_seeds = &[SOLVENT_AUTHORITY_SEED.as_bytes(), &[solvent_authority_bump]];
    let solvent_authority_signer_seeds = &[&solvent_authority_seeds[..]];

    let amount_to_claim = (ctx.accounts.solvent_authority.lamports() as u64)
        .checked_sub(Rent::minimum_balance(&ctx.accounts.rent, 0_usize))
        .unwrap();

    // Transfer lamports from Solvent authority to Solvent treasury
    let tranfer_lamports_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.solvent_authority.key(),
        &ctx.accounts.solvent_treasury.key(),
        amount_to_claim,
    );

    anchor_lang::solana_program::program::invoke_signed(
        &tranfer_lamports_ix,
        &[
            ctx.accounts.solvent_authority.to_account_info(),
            ctx.accounts.solvent_treasury.to_account_info(),
        ],
        solvent_authority_signer_seeds,
    )?;

    // Emit success event
    emit!(ClaimBalanceEvent {
        signer: ctx.accounts.signer.key(),
        sol_amount_claimed: amount_to_claim
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimBalance<'info> {
    pub signer: Signer<'info>,

    #[account(
        mut,
        address = SOLVENT_CORE_TREASURY @ SolventError::SolventTreasuryInvalid
    )]
    /// CHECK: Safe because there are enough constraints set
    pub solvent_treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SOLVENT_AUTHORITY_SEED.as_bytes()],
        bump,
    )]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub solvent_authority: UncheckedAccount<'info>,

    // Solana ecosystem program addresses
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct ClaimBalanceEvent {
    pub signer: Pubkey,
    pub sol_amount_claimed: u64,
}
