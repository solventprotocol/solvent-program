use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

pub fn distribute_revenue<'info>(
    ctx: Context<'_, '_, '_, 'info, DistributeRevenue<'info>>,
) -> Result<()> {
    // Calculate total revenue to distribute
    let total_collected_revenue = ctx
        .accounts
        .revenue_distribution_droplet_token_account
        .amount
        - Rent::minimum_balance(&ctx.accounts.rent, 0);

    // Iter through all the revenue partners and send share of revenue
    for revenue_partner in ctx
        .accounts
        .revenue_distribution_params
        .revenue_partners
        .iter()
    {
        // Calculate share of revenue to send
        let revenue_share = total_collected_revenue
            .checked_mul(revenue_partner.share_basis_points as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();

        // Get the token account from remaining accounts
        let destination_token_account = ctx
            .remaining_accounts
            .iter()
            .find(|x| x.key() == revenue_partner.address);

        if let Some(destination_token_account) = destination_token_account {
            // Send droplets
            let transfer_droplets_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info().clone(),
                Transfer {
                    from: ctx
                        .accounts
                        .revenue_distribution_droplet_token_account
                        .to_account_info()
                        .clone(),
                    to: destination_token_account.clone(),
                    authority: ctx.accounts.signer.to_account_info().clone(),
                },
            );
            transfer(transfer_droplets_ctx, revenue_share)?;
        } else {
            // Caller did not pass the token account in remaining accounts
            return err!(SolventError::RevenueDistributionParamsInvalid);
        }
    }

    // Emit success event
    emit!(DistributeRevenueEvent{
        signer: ctx.accounts.signer.key(),
        droplet_mint: ctx.accounts.droplet_mint.key()
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct DistributeRevenue<'info> {
    #[account(
        mut,
        address = SOLVENT_ADMIN @ SolventError::AdminAccessUnauthorized
    )]
    pub signer: Signer<'info>,

    pub droplet_mint: Account<'info, Mint>,

    #[account(
        seeds = [
            droplet_mint.key().as_ref(),
            REVENUE_DISTRIBUTION_PARAMS_SEED.as_bytes()
        ],
        bump = revenue_distribution_params.bump,
        has_one = droplet_mint
    )]
    pub revenue_distribution_params: Box<Account<'info, ReveneuDistributionParams>>,

    #[account(
        mut,
        address = get_associated_token_address(
            &revenue_distribution_params.key(),
            &droplet_mint.key()
        ),
    )]
    pub revenue_distribution_droplet_token_account: Box<Account<'info, TokenAccount>>,

    // Solana ecosystem program addresses
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct DistributeRevenueEvent {
    pub signer: Pubkey,
    pub droplet_mint: Pubkey,
}
