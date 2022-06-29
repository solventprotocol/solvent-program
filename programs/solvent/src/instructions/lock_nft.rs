use crate::common::*;
use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

// Lock an NFT into a locker and get droplets in exchange
pub fn lock_nft(
    ctx: Context<LockNft>,
    duration: u64,
    _whitelist_proof: Option<Vec<[u8; 32]>>,
) -> Result<CalculateLoanResult> {
    // Ensure there's at least 1 NFT in bucket
    require!(
        ctx.accounts.bucket_state.num_nfts_in_bucket > 0,
        SolventError::BucketEmpty
    );

    // Ensure locking duration is not too long
    require!(
        duration <= ctx.accounts.bucket_state.max_locker_duration,
        SolventError::LockerDurationInvalid
    );

    // Increment counter
    ctx.accounts.bucket_state.num_nfts_in_lockers = ctx
        .accounts
        .bucket_state
        .num_nfts_in_lockers
        .checked_add(1)
        .unwrap();

    // Calculate loan amount and interest rate
    let calculate_loan_result = calculate_loan(CalculateLoanArgs {
        max_locker_duration: ctx.accounts.bucket_state.max_locker_duration,
        num_nfts_in_bucket: ctx.accounts.bucket_state.num_nfts_in_bucket,
        num_nfts_in_lockers: ctx.accounts.bucket_state.num_nfts_in_lockers,
        interest_scaler: ctx.accounts.bucket_state.interest_scaler,
        locker_duration: duration,
    });

    // Transfer NFT to locker token account
    let nft_transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info().clone(),
        token::Transfer {
            from: ctx.accounts.signer_token_account.to_account_info().clone(),
            to: ctx.accounts.solvent_token_account.to_account_info().clone(),
            authority: ctx.accounts.signer.to_account_info().clone(),
        },
    );
    token::transfer(nft_transfer_ctx, 1)?;

    // Get Solvent authority signer seeds
    let solvent_authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let solvent_authority_seeds = &[SOLVENT_AUTHORITY_SEED.as_bytes(), &[solvent_authority_bump]];
    let solvent_authority_signer_seeds = &[&solvent_authority_seeds[..]];

    // Mint droplets to destination account
    let mint_droplets_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::MintTo {
            mint: ctx.accounts.droplet_mint.to_account_info().clone(),
            to: ctx
                .accounts
                .destination_droplet_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::mint_to(
        mint_droplets_ctx,
        calculate_loan_result.principal_amount as u64,
    )?;

    // Update LockerState account with information
    let clock: Clock = Clock::get().unwrap();
    *ctx.accounts.locker_state = LockerState {
        bump: *ctx.bumps.get("locker_state").unwrap(),
        droplet_mint: ctx.accounts.droplet_mint.key(),
        depositor: ctx.accounts.signer.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        duration,
        creation_timestamp: clock.unix_timestamp as u64,
        principal_amount: calculate_loan_result.principal_amount,
        max_interest_payable: calculate_loan_result.max_interest_payable,
    };

    // Emit success event
    emit!(LockNftEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        signer: ctx.accounts.signer.key(),
        signer_token_account: ctx.accounts.signer_token_account.key(),
        destination_droplet_account: ctx.accounts.destination_droplet_account.key()
    });

    Ok(calculate_loan_result)
}

#[derive(Accounts)]
#[instruction(_duration: u64, whitelist_proof: Option<Vec<[u8; 32]>>)]
pub struct LockNft<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            droplet_mint.key().as_ref(),
            BUCKET_SEED.as_bytes()
        ],
        bump = bucket_state.bump,
        constraint = bucket_state.is_locking_enabled @ SolventError::LockersDisabled,
        has_one = droplet_mint
    )]
    pub bucket_state: Box<Account<'info, BucketStateV3>>,

    #[account(
        init,
        seeds = [
            droplet_mint.key().as_ref(),
            nft_mint.key().as_ref(),
            LOCKER_SEED.as_bytes()
        ],
        payer=signer,
        space=LockerState::LEN,
        bump
    )]
    pub locker_state: Account<'info, LockerState>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        seeds = [SOLVENT_AUTHORITY_SEED.as_bytes()],
        bump,
    )]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub solvent_authority: UncheckedAccount<'info>,

    #[account(
        address = mpl_token_metadata::pda::find_metadata_account(&nft_mint.key()).0,
        constraint = mpl_token_metadata::check_id(metadata.owner),
        constraint = verify_collection(&metadata, &bucket_state.collection_info, whitelist_proof) @ SolventError::CollectionVerificationFailed
    )]
    /// CHECK: Safe because there are already enough constraints
    pub metadata: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = signer_token_account.mint == nft_mint.key()
    )]
    pub signer_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = nft_mint,
        associated_token::authority = solvent_authority,
    )]
    pub solvent_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub droplet_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = destination_droplet_account.mint == droplet_mint.key()
    )]
    pub destination_droplet_account: Box<Account<'info, TokenAccount>>,

    // Solana ecosystem program addresses
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct LockNftEvent {
    pub signer: Pubkey,
    pub droplet_mint: Pubkey,
    pub nft_mint: Pubkey,
    pub signer_token_account: Pubkey,
    pub destination_droplet_account: Pubkey,
}
