use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

pub fn update_revenue_distribution_params(ctx: Context<UpdateRevenueDistributionParams>, revenue_partners: Vec<RevenuePartner>) -> Result<()> {
    // Make sure the total share is 100
    let mut share_basis_points_sum: u16 = 0;
    for revenue_partner in revenue_partners.iter() {
        share_basis_points_sum += revenue_partner.share_basis_points;
    }
    require!(share_basis_points_sum == 10000, SolventError::RevenueDistributionParamsInvalid);

    // Store revenue partner infos
    **ctx.accounts.reveneu_distribution_params = ReveneuDistributionParams{
        bump: *ctx.bumps.get("reveneu_distribution_params").unwrap(),
        droplet_mint: ctx.accounts.droplet_mint.key(),
        revenue_partners: revenue_partners.clone()
    };

    // Emit success event
    emit!(UpdateRevenueDistributionParamsEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        signer: ctx.accounts.signer.key(),
        revenue_partners: revenue_partners.clone()
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateRevenueDistributionParams<'info> {
    #[account(
        mut,
        address = SOLVENT_ADMIN @ SolventError::AdminAccessUnauthorized
    )]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        seeds = [
            droplet_mint.key().as_ref(),
            REVENUE_DISTRIBUTION_PARAMS_SEED.as_bytes()
        ],
        bump,
        space = ReveneuDistributionParams::LEN,
        payer = signer
    )]
    pub reveneu_distribution_params: Box<Account<'info, ReveneuDistributionParams>>,

    pub droplet_mint: Account<'info, Mint>,

    // Solana ecosystem program addresses
    pub system_program: Program<'info, System>,
}

#[event]
pub struct UpdateRevenueDistributionParamsEvent {
    pub signer: Pubkey,
    pub droplet_mint: Pubkey,
    pub revenue_partners: Vec<RevenuePartner>
}
