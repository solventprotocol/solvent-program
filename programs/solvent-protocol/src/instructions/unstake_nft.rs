use crate::common::*;
use crate::constants::*;
use crate::errors::SolventError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::{get_associated_token_address, AssociatedToken};
use anchor_spl::token::{Mint, Token, TokenAccount};
use gem_bank::cpi::accounts::WithdrawGem;
use gem_bank::cpi::withdraw_gem;
use gem_farm::cpi::accounts::{Claim, Unstake};
use gem_farm::cpi::{claim, unstake};
use gem_farm::state::FarmerState;

pub fn unstake_nft(ctx: Context<UnstakeNft>) -> Result<()> {
    // Get farmer authority signer seeds
    let farmer_authority_bump = *ctx.bumps.get("farmer_authority").unwrap();
    let nft_mint = ctx.accounts.nft_mint.key();
    let farmer_authority_seeds = &[
        FARMER_AUTHORITY_SEED.as_bytes(),
        nft_mint.as_ref(),
        &[farmer_authority_bump],
    ];
    let farmer_authority_signer_seeds = &[&farmer_authority_seeds[..]];

    // Transfer some lamports to farmer authority cause that's needed in the next step
    let tranfer_lamports_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.signer.key(),
        &ctx.accounts.farmer_authority.key(),
        100_000_000,
    );
    anchor_lang::solana_program::program::invoke(
        &tranfer_lamports_ix,
        &[
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.farmer_authority.to_account_info(),
        ],
    )?;

    let farmer = parse_farmer(&ctx.accounts.gemworks_farmer)?;
    let clock: Clock = Clock::get().unwrap();

    // If NFT is staked: unstake once and put it into cooldown period
    if farmer.state == FarmerState::Staked {
        // Unstake NFT

        let gemworks_farm_authority_bump = *ctx.bumps.get("gemworks_farm_authority").unwrap();
        let gemworks_farm_treasury_bump = *ctx.bumps.get("gemworks_farm_treasury").unwrap();
        let gemworks_farmer_bump = *ctx.bumps.get("gemworks_farmer").unwrap();

        let unstake_ctx = CpiContext::new_with_signer(
            ctx.accounts.gemfarm_program.to_account_info().clone(),
            Unstake {
                farm: ctx.accounts.gemworks_farm.to_account_info().clone(),
                farmer: ctx.accounts.gemworks_farmer.to_account_info().clone(),
                bank: ctx.accounts.gemworks_bank.to_account_info().clone(),
                identity: ctx.accounts.farmer_authority.to_account_info().clone(),
                vault: ctx.accounts.gemworks_vault.to_account_info().clone(),
                farm_authority: ctx
                    .accounts
                    .gemworks_farm_authority
                    .to_account_info()
                    .clone(),
                farm_treasury: ctx
                    .accounts
                    .gemworks_farm_treasury
                    .to_account_info()
                    .clone(),
                gem_bank: ctx.accounts.gembank_program.to_account_info().clone(),
                fee_acc: ctx.accounts.gemworks_fee_account.to_account_info().clone(),
                system_program: ctx.accounts.system_program.to_account_info().clone(),
            },
            farmer_authority_signer_seeds,
        );

        unstake(
            unstake_ctx,
            gemworks_farm_authority_bump,
            gemworks_farm_treasury_bump,
            gemworks_farmer_bump,
            false,
        )?;

    // If cooldown is over and the second unstake is due: unstake, withdraw NFT and claim rewards
    } else if farmer.state == FarmerState::PendingCooldown
        && clock.unix_timestamp as u64 >= farmer.cooldown_ends_ts
    {
        // Unstake NFT

        let gemworks_farm_authority_bump = *ctx.bumps.get("gemworks_farm_authority").unwrap();
        let gemworks_farm_treasury_bump = *ctx.bumps.get("gemworks_farm_treasury").unwrap();
        let gemworks_farmer_bump = *ctx.bumps.get("gemworks_farmer").unwrap();

        let unstake_ctx = CpiContext::new_with_signer(
            ctx.accounts.gemfarm_program.to_account_info().clone(),
            Unstake {
                farm: ctx.accounts.gemworks_farm.to_account_info().clone(),
                farmer: ctx.accounts.gemworks_farmer.to_account_info().clone(),
                bank: ctx.accounts.gemworks_bank.to_account_info().clone(),
                identity: ctx.accounts.farmer_authority.to_account_info().clone(),
                vault: ctx.accounts.gemworks_vault.to_account_info().clone(),
                farm_authority: ctx
                    .accounts
                    .gemworks_farm_authority
                    .to_account_info()
                    .clone(),
                farm_treasury: ctx
                    .accounts
                    .gemworks_farm_treasury
                    .to_account_info()
                    .clone(),
                gem_bank: ctx.accounts.gembank_program.to_account_info().clone(),
                fee_acc: ctx.accounts.gemworks_fee_account.to_account_info().clone(),
                system_program: ctx.accounts.system_program.to_account_info().clone(),
            },
            farmer_authority_signer_seeds,
        );

        unstake(
            unstake_ctx,
            gemworks_farm_authority_bump,
            gemworks_farm_treasury_bump,
            gemworks_farmer_bump,
            false,
        )?;

        // Withdraw NFT from vault

        let withdraw_gem_ctx = CpiContext::new_with_signer(
            ctx.accounts.gemworks_bank.to_account_info(),
            WithdrawGem {
                bank: ctx.accounts.gemworks_bank.to_account_info().clone(),
                vault: ctx.accounts.gemworks_vault.to_account_info().clone(),
                owner: ctx.accounts.farmer_authority.to_account_info().clone(),
                authority: ctx
                    .accounts
                    .gemworks_vault_authority
                    .to_account_info()
                    .clone(),
                gem_box: ctx.accounts.gemworks_gem_box.to_account_info().clone(),
                gem_deposit_receipt: ctx.accounts.gemworks_gdr.to_account_info().clone(),
                gem_mint: ctx.accounts.nft_mint.to_account_info().clone(),
                gem_destination: ctx
                    .accounts
                    .solvent_nft_token_account
                    .to_account_info()
                    .clone(),
                gem_rarity: ctx.accounts.gemworks_gem_rarity.to_account_info().clone(),
                receiver: ctx.accounts.solvent_authority.to_account_info().clone(),
                system_program: ctx.accounts.system_program.to_account_info().clone(),
                token_program: ctx.accounts.token_program.to_account_info().clone(),
                associated_token_program: ctx
                    .accounts
                    .associated_token_program
                    .to_account_info()
                    .clone(),
                rent: ctx.accounts.rent.to_account_info().clone(),
            },
            farmer_authority_signer_seeds,
        );

        let gemworks_vault_authority_bump = *ctx.bumps.get("gemworks_vault_authority").unwrap();
        let gemworks_gem_box_bump = *ctx.bumps.get("gemworks_gem_box").unwrap();
        let gemworks_gdr_bump = *ctx.bumps.get("gemworks_gdr").unwrap();
        let gemworks_gem_rarity_bump = *ctx.bumps.get("gemworks_gem_rarity").unwrap();

        withdraw_gem(
            withdraw_gem_ctx,
            gemworks_vault_authority_bump,
            gemworks_gem_box_bump,
            gemworks_gdr_bump,
            gemworks_gem_rarity_bump,
            1,
        )?;

        // Claim staking rewards

        let claim_ctx = CpiContext::new_with_signer(
            ctx.accounts.gemfarm_program.to_account_info().clone(),
            Claim {
                farm: ctx.accounts.gemworks_farm.to_account_info().clone(),
                farm_authority: ctx
                    .accounts
                    .gemworks_farm_authority
                    .to_account_info()
                    .clone(),
                farmer: ctx.accounts.gemworks_farmer.to_account_info().clone(),
                identity: ctx.accounts.farmer_authority.to_account_info().clone(),
                reward_a_mint: ctx
                    .accounts
                    .gemworks_reward_a_mint
                    .to_account_info()
                    .clone(),
                reward_a_pot: ctx.accounts.gemworks_reward_a_pot.to_account_info().clone(),
                reward_a_destination: ctx
                    .accounts
                    .farmer_reward_a_token_account
                    .to_account_info()
                    .clone(),
                reward_b_mint: ctx
                    .accounts
                    .gemworks_reward_b_mint
                    .to_account_info()
                    .clone(),
                reward_b_pot: ctx.accounts.gemworks_reward_b_pot.to_account_info().clone(),
                reward_b_destination: ctx
                    .accounts
                    .farmer_reward_b_token_account
                    .to_account_info()
                    .clone(),
                // Solana ecosystem program addresses
                system_program: ctx.accounts.system_program.to_account_info().clone(),
                token_program: ctx.accounts.token_program.to_account_info().clone(),
                associated_token_program: ctx
                    .accounts
                    .associated_token_program
                    .to_account_info()
                    .clone(),
                rent: ctx.accounts.rent.to_account_info().clone(),
            },
            farmer_authority_signer_seeds,
        );

        let gemworks_farm_authority_bump = *ctx.bumps.get("gemworks_farm_authority").unwrap();
        let gemworks_farmer_bump = *ctx.bumps.get("gemworks_farmer").unwrap();
        let gemworks_reward_a_pot_bump = *ctx.bumps.get("gemworks_reward_a_pot").unwrap();
        let gemworks_reward_b_pot_bump = *ctx.bumps.get("gemworks_reward_b_pot").unwrap();

        claim(
            claim_ctx,
            gemworks_farm_authority_bump,
            gemworks_farmer_bump,
            gemworks_reward_a_pot_bump,
            gemworks_reward_b_pot_bump,
        )?;
    // This branch means the cooldown is still pending, so return an error
    } else if farmer.state == FarmerState::PendingCooldown {
        return err!(SolventError::StakingCooldownPending);
    }

    // Transfer remaining lamports to the solvent authority
    // This is needed to avoid DoS attacks (Denial of Staking)
    let tranfer_remaining_lamports_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.farmer_authority.key(),
        &ctx.accounts.solvent_authority.key(),
        ctx.accounts.farmer_authority.lamports(),
    );
    anchor_lang::solana_program::program::invoke_signed(
        &tranfer_remaining_lamports_ix,
        &[
            ctx.accounts.farmer_authority.to_account_info(),
            ctx.accounts.solvent_authority.to_account_info(),
        ],
        farmer_authority_signer_seeds,
    )?;

    // Emit success event
    emit!(UnstakeNftEvent {
        droplet_mint: ctx.accounts.droplet_mint.key(),
        signer: ctx.accounts.signer.key(),
        nft_mint: ctx.accounts.nft_mint.key()
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UnstakeNft<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
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
        associated_token::mint = gemworks_reward_a_mint,
        associated_token::authority = farmer_authority,
        payer = signer
    )]
    pub farmer_reward_a_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        associated_token::mint = gemworks_reward_b_mint,
        associated_token::authority = farmer_authority,
        payer = signer
    )]
    pub farmer_reward_b_token_account: Box<Account<'info, TokenAccount>>,

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
        address = bucket_state.staking_params.unwrap().gemworks_farm
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

    #[account(
        mut,
        seeds = [
            GEMWORKS_REWARD_POT_SEED.as_bytes(),
            gemworks_farm.key().as_ref(),
            gemworks_reward_a_mint.key().as_ref()
        ],
        bump,
        seeds::program = gemfarm_program.key(),
    )]
    pub gemworks_reward_a_pot: Box<Account<'info, TokenAccount>>,

    pub gemworks_reward_a_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [
            GEMWORKS_REWARD_POT_SEED.as_bytes(),
            gemworks_farm.key().as_ref(),
            gemworks_reward_b_mint.key().as_ref()
        ],
        bump,
        seeds::program = gemfarm_program.key(),
    )]
    pub gemworks_reward_b_pot: Box<Account<'info, TokenAccount>>,

    pub gemworks_reward_b_mint: Box<Account<'info, Mint>>,

    /// CHECK:
    #[account(
        mut,
        seeds = [
            GEMWORKS_FARM_TREASURY_SEED.as_bytes(),
            gemworks_farm.key().as_ref()
        ],
        bump,
        seeds::program = gemfarm_program.key(),
    )]
    pub gemworks_farm_treasury: UncheckedAccount<'info>,

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

    #[account(
        mut,
        seeds = [
            GEMWORKS_GEM_BOX_SEED.as_bytes(),
            gemworks_vault.key().as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = gembank_program.key(),
        constraint = gemworks_gem_box.mint == nft_mint.key()
    )]
    pub gemworks_gem_box: Box<Account<'info, TokenAccount>>,

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
pub struct UnstakeNftEvent {
    pub signer: Pubkey,
    pub droplet_mint: Pubkey,
    pub nft_mint: Pubkey,
}
