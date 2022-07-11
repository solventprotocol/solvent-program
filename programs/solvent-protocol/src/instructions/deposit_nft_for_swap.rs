use crate::common::*;
use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

// Deposit an NFT into a bucket and get droplets in exchange
pub fn deposit_nft_for_swap(
    ctx: Context<DepositNftForSwap>,
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

    // Get Solvent authority signer seeds
    let solvent_authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let solvent_authority_seeds = &[SOLVENT_AUTHORITY_SEED.as_bytes(), &[solvent_authority_bump]];
    let solvent_authority_signer_seeds = &[&solvent_authority_seeds[..]];

    let fee_amount = (DROPLETS_PER_NFT as u64)
    .checked_mul(LAMPORTS_PER_DROPLET as u64)
    .unwrap()
    .checked_mul(SWAP_FEE_BASIS_POINTS as u64)
    .unwrap()
    .checked_div(10000)
    .unwrap();

    // Mint droplets minus fee amount to destination account
    let mint_droplets_to_signer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::MintTo {
            mint: ctx.accounts.droplet_mint.to_account_info().clone(),
            to: ctx
                .accounts
                .destination_droplet_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::mint_to(
        mint_droplets_to_signer_ctx,
        (DROPLETS_PER_NFT as u64 * LAMPORTS_PER_DROPLET) - fee_amount,
    )?;

    // Mint fees to Solvent treasury
    let mint_droplets_to_treasury_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::MintTo {
            mint: ctx.accounts.droplet_mint.to_account_info().clone(),
            to: ctx
                .accounts
                .solvent_treasury_droplet_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::mint_to(
        mint_droplets_to_treasury_ctx,
        fee_amount,
    )?;

    // Increment counter
    ctx.accounts.bucket_state.num_nfts_in_bucket = ctx
        .accounts
        .bucket_state
        .num_nfts_in_bucket
        .checked_add(1)
        .unwrap();

    // Emit success event
    emit!(DepositNftForSwapEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        signer: ctx.accounts.signer.key(),
        signer_nft_token_account: ctx.accounts.signer_nft_token_account.key(),
        destination_droplet_token_account: ctx.accounts.destination_droplet_token_account.key()
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(whitelist_proof: Option<Vec<[u8; 32]>>)]
pub struct DepositNftForSwap<'info> {
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

    #[account(
        init,
        seeds = [
            droplet_mint.key().as_ref(),
            signer.key().as_ref(),
            SWAP_SEED.as_bytes()
        ],
    bump,
    payer = signer,
    space = SwapState::LEN
    )]
    pub swap_state: Account<'info, SwapState>,

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

    #[account(
        mut,
        constraint = destination_droplet_token_account.mint == droplet_mint.key()
    )]
    pub destination_droplet_token_account: Box<Account<'info, TokenAccount>>,

    #[account(address = SOLVENT_CORE_TREASURY @ SolventError::SolventTreasuryInvalid)]
    /// CHECK: Safe because there are enough constraints set
    pub solvent_treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = droplet_mint,
        associated_token::authority = solvent_treasury,
    )]
    pub solvent_treasury_droplet_token_account: Box<Account<'info, TokenAccount>>,

    // Solana ecosystem program addresses
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct DepositNftForSwapEvent {
    pub signer: Pubkey,
    pub droplet_mint: Pubkey,
    pub nft_mint: Pubkey,
    pub signer_nft_token_account: Pubkey,
    pub destination_droplet_token_account: Pubkey,
}
