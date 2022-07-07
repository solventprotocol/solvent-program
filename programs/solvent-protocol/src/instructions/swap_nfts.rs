use crate::common::*;
use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

// Swap an NFT for another NFT
pub fn swap_nfts(ctx: Context<SwapNfts>, _whitelist_proof: Option<Vec<[u8; 32]>>) -> Result<()> {
    // Set DepositState account contents for the NFT to deposit
    *ctx.accounts.deposit_state_for_deposit = DepositState {
        bump: *ctx.bumps.get("deposit_state").unwrap(),
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_to_deposit_mint.key(),
    };

    // Transfer NFT to deposit to Solvent's token account
    let transfer_nft_to_deposit_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Transfer {
            from: ctx
                .accounts
                .signer_nft_to_deposit_token_account
                .to_account_info()
                .clone(),
            to: ctx
                .accounts
                .solvent_nft_to_deposit_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.signer.to_account_info().clone(),
        },
    );
    token::transfer(transfer_nft_to_deposit_ctx, 1)?;

    // Get Solvent authority signer seeds
    let solvent_authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let solvent_authority_seeds = &[SOLVENT_AUTHORITY_SEED.as_bytes(), &[solvent_authority_bump]];
    let solvent_authority_signer_seeds = &[&solvent_authority_seeds[..]];

    // Transfer NFT to redeem to destination account
    let transfer_nft_to_redeem_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Transfer {
            from: ctx
                .accounts
                .solvent_nft_to_redeem_token_account
                .to_account_info()
                .clone(),
            to: ctx
                .accounts
                .destination_nft_to_redeem_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::transfer(transfer_nft_to_redeem_ctx, 1)?;

    // Send swap fee to RevenueDistributionParams PDA
    let fee_amount = (DROPLETS_PER_NFT as u64)
        .checked_mul(LAMPORTS_PER_DROPLET as u64)
        .unwrap()
        .checked_mul(SWAP_FEE_BASIS_POINTS as u64)
        .unwrap()
        .checked_div(10000)
        .unwrap();
    let transfer_fee_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Transfer {
            from: ctx
                .accounts
                .signer_droplet_token_account
                .to_account_info()
                .clone(),
            to: ctx
                .accounts
                .revenue_distribution_droplet_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.signer.to_account_info().clone(),
        },
    );
    token::transfer(transfer_fee_ctx, fee_amount)?;

    // Close Solvent's NFT token account to reclaim lamports
    let close_nft_token_account_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::CloseAccount {
            account: ctx
                .accounts
                .solvent_nft_to_redeem_token_account
                .to_account_info()
                .clone(),
            destination: ctx.accounts.signer.to_account_info().clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::close_account(close_nft_token_account_ctx)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(whitelist_proof: Option<Vec<[u8; 32]>>)]
pub struct SwapNfts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

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

    #[account(
        mut,
        seeds = [
            droplet_mint.key().as_ref(),
            nft_to_redeem_mint.key().as_ref(),
            DEPOSIT_SEED.as_bytes()
        ],
        bump = deposit_state_for_redeem.bump,
        close = signer,
        constraint = deposit_state_for_redeem.nft_mint == nft_to_redeem_mint.key(),
        has_one = droplet_mint
    )]
    pub deposit_state_for_redeem: Account<'info, DepositState>,

    #[account(
        init,
        seeds = [
            droplet_mint.key().as_ref(),
            nft_to_deposit_mint.key().as_ref(),
            DEPOSIT_SEED.as_bytes()
        ],
        bump,
        payer = signer,
        space = DepositState::LEN
    )]
    pub deposit_state_for_deposit: Account<'info, DepositState>,

    #[account(mut)]
    pub droplet_mint: Account<'info, Mint>,

    pub nft_to_deposit_mint: Account<'info, Mint>,

    #[account(
        address = mpl_token_metadata::pda::find_metadata_account(&nft_to_deposit_mint.key()).0,
        constraint = mpl_token_metadata::check_id(nft_to_deposit_metadata.owner),
        constraint = verify_collection(&nft_to_deposit_metadata, &bucket_state.collection_info, whitelist_proof) @ SolventError::CollectionVerificationFailed
    )]
    /// CHECK: Safe because there are already enough constraints
    pub nft_to_deposit_metadata: UncheckedAccount<'info>,

    pub nft_to_redeem_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = get_associated_token_address(solvent_authority.key, &nft_to_redeem_mint.key()),
    )]
    pub solvent_nft_to_redeem_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = destination_nft_to_redeem_token_account.mint == nft_to_redeem_mint.key(),
    )]
    pub destination_nft_to_redeem_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            droplet_mint.key().as_ref(),
            REVENUE_DISTRIBUTION_PARAMS_SEED.as_bytes()
        ],
        bump = revenue_distribution_params.bump,
        has_one = droplet_mint,
    )]
    pub revenue_distribution_params: Box<Account<'info, ReveneuDistributionParams>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = droplet_mint,
        associated_token::authority = revenue_distribution_params,
    )]
    pub revenue_distribution_droplet_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = signer_nft_to_deposit_token_account.mint == nft_to_deposit_mint.key()
    )]
    pub signer_nft_to_deposit_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = nft_to_deposit_mint,
        associated_token::authority = solvent_authority,
    )]
    pub solvent_nft_to_deposit_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = signer_droplet_token_account.mint == droplet_mint.key()
    )]
    pub signer_droplet_token_account: Box<Account<'info, TokenAccount>>,

    // Solana ecosystem program addresses
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct RedeemNftEvent {
    pub signer: Pubkey,
    pub nft_mint: Pubkey,
    pub droplet_mint: Pubkey,
    pub signer_droplet_token_account: Pubkey,
    pub destination_nft_token_account: Pubkey,
}
