use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::{get_associated_token_address, AssociatedToken};
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

// Liquidate a locked NFT position that is defaulted
pub fn liquidate_locker(ctx: Context<LiquidateLocker>) -> Result<()> {
    let clock: Clock = Clock::get().unwrap();

    // Verify that the loan has defaulted and is up for liquidation
    require!(
        clock.unix_timestamp as u64
            > ctx
                .accounts
                .locker_state
                .creation_timestamp
                .checked_add(ctx.accounts.locker_state.duration)
                .unwrap(),
        SolventError::LockerActive
    );

    // Calculate additional droplets to mint
    let droplets_to_mint = (DROPLETS_PER_NFT as u64)
        .checked_mul(LAMPORTS_PER_DROPLET)
        .unwrap()
        .checked_sub(ctx.accounts.locker_state.principal_amount)
        .unwrap();

    // Calculate the split between Solvent treasury and liquidation reward
    let liquidation_reward = droplets_to_mint
        .checked_mul(LIQUIDATION_REWARD_PERCENTAGE as u64)
        .unwrap()
        .checked_div(DROPLETS_PER_NFT as u64)
        .unwrap();
    let to_store_in_vault = droplets_to_mint.checked_sub(liquidation_reward).unwrap();

    // Get Solvent authority signer seeds
    let solvent_authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let solvent_authority_seeds = &[SOLVENT_AUTHORITY_SEED.as_bytes(), &[solvent_authority_bump]];
    let solvent_authority_signer_seeds = &[&solvent_authority_seeds[..]];

    // Mint additional droplets and send to Solvent treasury
    let mint_droplets_to_vault_ctx = CpiContext::new_with_signer(
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
    token::mint_to(mint_droplets_to_vault_ctx, to_store_in_vault)?;

    // Mint liquidation reward droplets and send to signer
    let mint_droplets_to_signer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        token::MintTo {
            mint: ctx.accounts.droplet_mint.to_account_info().clone(),
            to: ctx
                .accounts
                .signer_droplet_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    token::mint_to(mint_droplets_to_signer_ctx, liquidation_reward)?;

    // Set DepositState account contents
    *ctx.accounts.deposit_state = DepositState {
        bump: *ctx.bumps.get("deposit_state").unwrap(),
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
    };

    // Update counters
    ctx.accounts.bucket_state.num_nfts_in_lockers = ctx
        .accounts
        .bucket_state
        .num_nfts_in_lockers
        .checked_sub(1)
        .unwrap();
    ctx.accounts.bucket_state.num_nfts_in_bucket = ctx
        .accounts
        .bucket_state
        .num_nfts_in_bucket
        .checked_add(1)
        .unwrap();

    // Emit success event
    emit!(LiquidateLockerEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        signer: ctx.accounts.signer.key(),
        signer_droplet_token_account: ctx.accounts.signer_droplet_token_account.key(),
        // LockerState params
        creation_timestamp: ctx.accounts.locker_state.creation_timestamp,
        duration: ctx.accounts.locker_state.duration,
        principal_amount: ctx.accounts.locker_state.principal_amount,
        max_interest_payable: ctx.accounts.locker_state.max_interest_payable,
        // Counters
        num_nfts_in_bucket: ctx.accounts.bucket_state.num_nfts_in_bucket,
        num_nfts_in_lockers: ctx.accounts.bucket_state.num_nfts_in_lockers,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct LiquidateLocker<'info> {
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

    pub nft_mint: Account<'info, Mint>,

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
            nft_mint.key().as_ref(),
            LOCKER_SEED.as_bytes()
        ],
        bump = locker_state.bump,
        has_one = droplet_mint,
        has_one = nft_mint,
        close = signer
    )]
    pub locker_state: Account<'info, LockerState>,

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

    #[account(address = SOLVENT_LOCKERS_TREASURY @ SolventError::SolventTreasuryInvalid)]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub solvent_treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = droplet_mint,
        associated_token::authority = solvent_treasury,
    )]
    pub solvent_treasury_droplet_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = signer_droplet_token_account.mint == droplet_mint.key()
    )]
    pub signer_droplet_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        address = get_associated_token_address(solvent_authority.key, &nft_mint.key()),
    )]
    pub solvent_nft_token_account: Box<Account<'info, TokenAccount>>,

    // Solana ecosystem program addresses
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct LiquidateLockerEvent {
    pub signer: Pubkey,
    pub nft_mint: Pubkey,
    pub droplet_mint: Pubkey,
    pub signer_droplet_token_account: Pubkey,
    // LockerState params
    pub creation_timestamp: u64,
    pub duration: u64,
    pub principal_amount: u64,
    pub max_interest_payable: u64,
    // Counters
    pub num_nfts_in_bucket: u16,
    pub num_nfts_in_lockers: u16,
}
