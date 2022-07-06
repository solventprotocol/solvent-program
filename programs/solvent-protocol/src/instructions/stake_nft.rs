use crate::common::*;
use crate::constants::*;
use crate::errors::SolventError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{close_account, CloseAccount};
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};
use gem_farm::cpi::accounts::{FlashDeposit, InitFarmer};
use gem_farm::cpi::{flash_deposit, init_farmer};

pub fn stake_nft(ctx: Context<StakeNft>) -> Result<()> {
    // Get Solvent authority signer seeds
    let solvent_authority_bump = *ctx.bumps.get("solvent_authority").unwrap();
    let solvent_authority_seeds = &[SOLVENT_AUTHORITY_SEED.as_bytes(), &[solvent_authority_bump]];
    let solvent_authority_signer_seeds = &[&solvent_authority_seeds[..]];

    // Transfer NFT from Solvent authority to farmer authority
    let nft_transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        Transfer {
            from: ctx
                .accounts
                .solvent_nft_token_account
                .to_account_info()
                .clone(),
            to: ctx
                .accounts
                .farmer_nft_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.solvent_authority.to_account_info().clone(),
        },
        solvent_authority_signer_seeds,
    );
    transfer(nft_transfer_ctx, 1)?;

    // Get farmer authority signer seeds
    let farmer_authority_bump = *ctx.bumps.get("farmer_authority").unwrap();
    let nft_mint = ctx.accounts.nft_mint.key();
    let farmer_authority_seeds = &[
        FARMER_AUTHORITY_SEED.as_bytes(),
        nft_mint.as_ref(),
        &[farmer_authority_bump],
    ];
    let farmer_authority_signer_seeds = &[&farmer_authority_seeds[..]];

    let init_farmer_ctx = CpiContext::new_with_signer(
        ctx.accounts.gemfarm_program.to_account_info().clone(),
        InitFarmer {
            farm: ctx.accounts.gemworks_farm.to_account_info().clone(),
            farmer: ctx.accounts.gemworks_farmer.to_account_info().clone(),
            bank: ctx.accounts.gemworks_bank.to_account_info().clone(),
            identity: ctx.accounts.farmer_authority.to_account_info().clone(),
            vault: ctx.accounts.gemworks_vault.to_account_info().clone(),
            payer: ctx.accounts.signer.to_account_info().clone(),
            gem_bank: ctx.accounts.gembank_program.to_account_info().clone(),
            fee_acc: ctx.accounts.gemworks_fee_account.to_account_info().clone(),
            system_program: ctx.accounts.system_program.to_account_info().clone(),
        },
        farmer_authority_signer_seeds,
    );
    init_farmer(init_farmer_ctx)?;

    // Transfer some lamports to farmer authority cause that's needed in the next step
    let tranfer_lamports_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.signer.key(),
        &ctx.accounts.farmer_authority.key(),
        10000000,
    );
    anchor_lang::solana_program::program::invoke(
        &tranfer_lamports_ix,
        &[
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.farmer_authority.to_account_info(),
        ],
    )?;

    let flash_deposit_ctx = CpiContext::new_with_signer(
        ctx.accounts.gemfarm_program.to_account_info().clone(),
        FlashDeposit {
            farm: ctx.accounts.gemworks_farm.to_account_info().clone(),
            farmer: ctx.accounts.gemworks_farmer.to_account_info().clone(),
            farm_authority: ctx
                .accounts
                .gemworks_farm_authority
                .to_account_info()
                .clone(),
            bank: ctx.accounts.gemworks_bank.to_account_info().clone(),
            identity: ctx.accounts.farmer_authority.to_account_info().clone(),
            vault: ctx.accounts.gemworks_vault.to_account_info().clone(),
            vault_authority: ctx
                .accounts
                .gemworks_vault_authority
                .to_account_info()
                .clone(),
            gem_box: ctx.accounts.gemworks_gem_box.to_account_info().clone(),
            gem_deposit_receipt: ctx.accounts.gemworks_gdr.to_account_info().clone(),
            gem_rarity: ctx.accounts.gemworks_gem_rarity.to_account_info().clone(),
            gem_source: ctx
                .accounts
                .farmer_nft_token_account
                .to_account_info()
                .clone(),
            gem_mint: ctx.accounts.nft_mint.to_account_info().clone(),
            gem_bank: ctx.accounts.gembank_program.to_account_info().clone(),
            fee_acc: ctx.accounts.gemworks_fee_account.to_account_info().clone(),
            system_program: ctx.accounts.system_program.to_account_info().clone(),
            token_program: ctx.accounts.token_program.to_account_info().clone(),
            rent: ctx.accounts.rent.to_account_info().clone(),
        },
        farmer_authority_signer_seeds,
    );

    let gemworks_vault_authority_bump = *ctx.bumps.get("gemworks_vault_authority").unwrap();
    let gemworks_farmer_bump = *ctx.bumps.get("gemworks_farmer").unwrap();
    let gemworks_gem_rarity_bump = *ctx.bumps.get("gemworks_gem_rarity").unwrap();

    flash_deposit(
        flash_deposit_ctx,
        gemworks_farmer_bump,
        gemworks_vault_authority_bump,
        gemworks_gem_rarity_bump,
        1,
    )?;

    // Close farmer's NFT token account to reclaim lamports
    let close_token_account_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        CloseAccount {
            account: ctx
                .accounts
                .farmer_nft_token_account
                .to_account_info()
                .clone(),
            destination: ctx.accounts.signer.to_account_info().clone(),
            authority: ctx.accounts.farmer_authority.to_account_info().clone(),
        },
        farmer_authority_signer_seeds,
    );
    close_account(close_token_account_ctx)?;

    // Transfer remaining lamports back to the signer
    let tranfer_remaining_lamports_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.farmer_authority.key(),
        &ctx.accounts.signer.key(),
        ctx.accounts.farmer_authority.lamports(),
    );
    anchor_lang::solana_program::program::invoke_signed(
        &tranfer_remaining_lamports_ix,
        &[
            ctx.accounts.farmer_authority.to_account_info(),
            ctx.accounts.signer.to_account_info(),
        ],
        farmer_authority_signer_seeds,
    )?;

    // Emit success event
    emit!(StakeNftEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        signer: ctx.accounts.signer.key(),
        nft_mint: ctx.accounts.nft_mint.key()
    });

    Ok(())
}

#[derive(Accounts)]
pub struct StakeNft<'info> {
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
            FARMER_AUTHORITY_SEED.as_bytes(),
            nft_mint.key().as_ref(),
        ],
        bump,
    )]
    /// CHECK: Safe because this read-only account only gets used as a constraint
    pub farmer_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [
            droplet_mint.key().as_ref(),
            BUCKET_SEED.as_bytes()
        ],
        bump = bucket_state.bump,
        constraint = bucket_state.is_staking_enabled @ SolventError::StakingDisabled,
        has_one = droplet_mint
    )]
    pub bucket_state: Box<Account<'info, BucketStateV3>>,

    pub droplet_mint: Account<'info, Mint>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        address = get_associated_token_address(solvent_authority.key, &nft_mint.key()),
    )]
    pub solvent_nft_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = nft_mint,
        associated_token::authority = farmer_authority,
    )]
    pub farmer_nft_token_account: Box<Account<'info, TokenAccount>>,

    // Gemworks accounts
    /// CHECK:
    #[account(
        mut,
        constraint = validate_bank(&gemworks_farm, &gemworks_bank)?,
        owner = gembank_program.key()
    )]
    pub gemworks_bank: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        mut,
        address = bucket_state.staking_params.unwrap().gemworks_farm,
        constraint = validate_farm(&gemworks_farm)? @ SolventError::FarmConfigInvalid,
        owner = gemfarm_program.key()
    )]
    pub gemworks_farm: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        seeds = [gemworks_farm.key().as_ref()],
        bump,
        seeds::program = gemfarm_program.key(),
    )]
    pub gemworks_farm_authority: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        mut,
        seeds = [
            GEMWORKS_FARMER_SEED.as_bytes(),
            gemworks_farm.key().as_ref(),
            farmer_authority.key().as_ref(),
        ],
        bump,
        seeds::program = gemfarm_program.key(),
    )]
    pub gemworks_farmer: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        mut,
        seeds = [
            GEMWORKS_VAULT_SEED.as_bytes(),
            gemworks_bank.key().as_ref(),
            farmer_authority.key().as_ref(),
        ],
        bump,
        seeds::program = gembank_program.key(),
    )]
    pub gemworks_vault: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        mut,
        seeds = [
            GEMWORKS_GEM_BOX_SEED.as_bytes(),
            gemworks_vault.key().as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = gembank_program.key(),
    )]
    pub gemworks_gem_box: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        mut,
        seeds = [
            GEMWORKS_GDR_SEED.as_bytes(),
            gemworks_vault.key().as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = gembank_program.key(),
    )]
    pub gemworks_gdr: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        seeds = [
            gemworks_vault.key().as_ref(),
        ],
        bump,
        seeds::program = gembank_program.key(),
    )]
    pub gemworks_vault_authority: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        mut,
        seeds = [
            GEMWORKS_GEM_RARITY_SEED.as_bytes(),
            gemworks_bank.key().as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = gembank_program.key(),
    )]
    pub gemworks_gem_rarity: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        executable,
        address = bucket_state.staking_params.unwrap().gembank_program
    )]
    pub gembank_program: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        executable,
        address = bucket_state.staking_params.unwrap().gemfarm_program
    )]
    pub gemfarm_program: UncheckedAccount<'info>,

    /// CHECK:
    #[account(
        mut,
        address = bucket_state.staking_params.unwrap().gemworks_fee_account
    )]
    pub gemworks_fee_account: UncheckedAccount<'info>,

    // Solana ecosystem program addresses
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[event]
pub struct StakeNftEvent {
    pub signer: Pubkey,
    pub droplet_mint: Pubkey,
    pub nft_mint: Pubkey,
}
