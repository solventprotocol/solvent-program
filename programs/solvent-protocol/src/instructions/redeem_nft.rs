use crate::constants::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

// Burn droplets and redeem an NFT from the bucket in exchange
pub fn redeem_nft(ctx: Context<RedeemNft>) -> Result<()> {
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
        DROPLETS_PER_NFT as u64 * LAMPORTS_PER_DROPLET,
    )?;

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

    // Close bucket's NFT token account to reclaim lamports
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
    ctx.accounts.bucket_state.num_nfts_in_bucket = ctx
        .accounts
        .bucket_state
        .num_nfts_in_bucket
        .checked_sub(1)
        .unwrap();

    // Emit success event
    emit!(RedeemNftEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        signer: ctx.accounts.signer.key(),
        destination_token_account: ctx.accounts.destination_token_account.key(),
        signer_droplet_account: ctx.accounts.signer_droplet_account.key()
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RedeemNft<'info> {
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
            nft_mint.key().as_ref(),
            DEPOSIT_SEED.as_bytes()
        ],
        bump = deposit_state.bump,
        close = signer,
        has_one = nft_mint,
        has_one = droplet_mint
    )]
    pub deposit_state: Account<'info, DepositState>,

    #[account(mut)]
    pub droplet_mint: Account<'info, Mint>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = get_associated_token_address(solvent_authority.key, &nft_mint.key()),
    )]
    pub solvent_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = destination_token_account.mint == nft_mint.key(),
    )]
    pub destination_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = signer_droplet_account.mint == droplet_mint.key()
    )]
    pub signer_droplet_account: Box<Account<'info, TokenAccount>>,

    // Solana ecosystem program addresses
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct RedeemNftEvent {
    pub signer: Pubkey,
    pub nft_mint: Pubkey,
    pub droplet_mint: Pubkey,
    pub signer_droplet_account: Pubkey,
    pub destination_token_account: Pubkey,
}
