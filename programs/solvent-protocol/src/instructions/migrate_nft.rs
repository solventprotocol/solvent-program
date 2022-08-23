use crate::common::*;
use crate::constants::*;
use crate::errors::SolventError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

// Deposit an NFT into a bucket and get droplets in exchange
pub fn migrate_nft(
    ctx: Context<MigrateNft>,
    _whitelist_proof: Option<Vec<[u8; 32]>>,
) -> Result<()> {
    // Set DepositState account contents
    *ctx.accounts.deposit_state = DepositState {
        bump: *ctx.bumps.get("deposit_state").unwrap(),
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
    };

    // Transfer NFT to bucket's token account
    let transfer_nft_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Transfer {
            from: ctx
                .accounts
                .signer_nft_token_account
                .to_account_info()
                .clone(),
            to: ctx
                .accounts
                .solvent_nft_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.signer.to_account_info().clone(),
        },
    );
    token::transfer(transfer_nft_ctx, 1)?;

    // Increment counter
    ctx.accounts.bucket_state.num_nfts_in_bucket = ctx
        .accounts
        .bucket_state
        .num_nfts_in_bucket
        .checked_add(1)
        .unwrap();

    // Emit success event
    emit!(MigrateNftEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(whitelist_proof: Option<Vec<[u8; 32]>>)]
pub struct MigrateNft<'info> {
    #[account(
        mut,
        address = SOLVENT_CRANK @ SolventError::AdminAccessUnauthorized
    )]
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
        init,
        seeds = [
            droplet_mint.key().as_ref(),
            nft_mint.key().as_ref(),
            DEPOSIT_SEED.as_bytes()
        ],
        bump,
        payer = signer,
        space = DepositState::LEN
    )]
    pub deposit_state: Account<'info, DepositState>,

    #[account(mut)]
    pub droplet_mint: Account<'info, Mint>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        address = mpl_token_metadata::pda::find_metadata_account(&nft_mint.key()).0,
        constraint = mpl_token_metadata::check_id(nft_metadata.owner),
        constraint = verify_collection(&nft_metadata, &bucket_state.collection_info, whitelist_proof) @ SolventError::CollectionVerificationFailed
    )]
    /// CHECK: Safe because there are already enough constraints
    pub nft_metadata: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = signer_nft_token_account.mint == nft_mint.key()
    )]
    pub signer_nft_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = nft_mint,
        associated_token::authority = solvent_authority,
    )]
    pub solvent_nft_token_account: Box<Account<'info, TokenAccount>>,

    // Solana ecosystem program addresses
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct MigrateNftEvent {
    pub droplet_mint: Pubkey,
    pub nft_mint: Pubkey,
}
