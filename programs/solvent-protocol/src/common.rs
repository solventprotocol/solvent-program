use crate::constants::*;
use anchor_lang::prelude::*;
use gem_farm::state::{Farm, Farmer};
use mpl_token_metadata::state::Metadata;

// Collection info, required to verify if an NFT belongs to a collection
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CollectionInfo {
    // Symbol and verified creators of the collection, for metadata accounts created by CreateMetadataAccount
    V1 {
        symbol: String,
        verified_creators: Vec<Pubkey>,
        whitelist_root: [u8; 32],
    },
    // The token mint of the collection NFT, for metadata accounts created by CreateMetadataAccountV2
    V2 {
        collection_mint: Pubkey,
    },
}

impl CollectionInfo {
    // 1 + largest variant: 1 String of 8 chars, 1 Vev<Pubkey>, 1 hash of 32 bytes
    pub const LEN: usize = 1 + (4 + 32) + (4 + (32 * 5)) + 32;
}

// Verify in the NFT belongs to the collection
pub fn verify_collection(
    metadata: &AccountInfo,
    collection_info: &CollectionInfo,
    whitelist_proof: Option<Vec<[u8; 32]>>,
) -> bool {
    let metadata = Metadata::from_account_info(metadata).unwrap();

    match collection_info {
        CollectionInfo::V1 {
            symbol,
            verified_creators,
            whitelist_root,
        } => {
            // Check if the symbol matches
            let trimmed_symbol = metadata.data.symbol.trim_matches(char::from(0));
            let valid_symbol = trimmed_symbol == symbol;

            // Check if at least one NFT creator exists in BucketState's verified creators
            let creators = metadata.data.creators.unwrap();
            let mut valid_creator = false;
            if !verified_creators.is_empty() {
                valid_creator = creators.iter().any(|creator| {
                    creator.verified
                        && verified_creators.iter().any(|additional_verified_creator| {
                            creator.address == *additional_verified_creator
                        })
                });
            }

            // Check if NFT exists in whitelist
            let leaf = anchor_lang::solana_program::keccak::hash(&metadata.mint.to_bytes()).0;
            let in_whitelist = verify_proof(whitelist_proof.unwrap(), *whitelist_root, leaf);

            valid_symbol && valid_creator && in_whitelist
        }

        CollectionInfo::V2 { collection_mint } => match metadata.collection {
            // Check that the collection field exists
            None => false,
            Some(collection) => {
                // Check that the collection mint matches, and verified is true
                collection.key == *collection_mint && collection.verified
            }
        },
    }
}

#[derive(PartialEq, Eq, Debug)]
pub struct CalculateLoanArgs {
    pub max_locker_duration: u64,
    pub num_nfts_in_bucket: u16,
    pub num_nfts_in_lockers: u16,
    pub interest_scaler: u8,
    pub locker_duration: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Eq, Debug)]
pub struct CalculateLoanResult {
    pub principal_amount: u64,
    pub max_interest_payable: u64,
}

// Returns tuple of pricipal amount and max interest payable
pub fn calculate_loan(args: CalculateLoanArgs) -> CalculateLoanResult {
    let x = args.num_nfts_in_bucket;
    let y = args.num_nfts_in_lockers;

    let x_plus_y = (y as u64).checked_add(x as u64).unwrap();

    let numerator = args
        .locker_duration
        .checked_mul(y as u64)
        .unwrap()
        .checked_mul(DROPLETS_PER_NFT as u64)
        .unwrap()
        .checked_mul(LAMPORTS_PER_DROPLET)
        .unwrap();

    let denominator = args.max_locker_duration.checked_mul(x_plus_y).unwrap();

    let raw_interest = numerator
        .checked_add(denominator.checked_sub(1).unwrap())
        .unwrap()
        .checked_div(denominator)
        .unwrap();

    let scaled_interest = raw_interest
        .checked_mul(args.interest_scaler as u64)
        .unwrap()
        .checked_div(MAX_INTEREST_SCALER as u64)
        .unwrap();

    let max_droplets_per_nft = LAMPORTS_PER_DROPLET
        .checked_mul(DROPLETS_PER_NFT as u64)
        .unwrap();

    let principal_amount = max_droplets_per_nft.checked_sub(raw_interest).unwrap();

    CalculateLoanResult {
        principal_amount,
        max_interest_payable: scaled_interest,
    }
}

pub fn verify_proof(proof: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed_hash = leaf;
    for proof_element in proof.into_iter() {
        if computed_hash <= proof_element {
            // Hash(current computed hash + current element of the proof)
            computed_hash =
                anchor_lang::solana_program::keccak::hashv(&[&computed_hash, &proof_element]).0;
        } else {
            // Hash(current element of the proof + current computed hash)
            computed_hash =
                anchor_lang::solana_program::keccak::hashv(&[&proof_element, &computed_hash]).0;
        }
    }
    // Check if the computed hash (root) is equal to the provided root
    computed_hash == root
}

fn parse_farm(info: &AccountInfo) -> Result<Farm> {
    let mut data: &[u8] = &info.try_borrow_data()?;
    Farm::try_deserialize(&mut data)
}

pub fn parse_farmer(info: &AccountInfo) -> Result<Farmer> {
    let mut data: &[u8] = &info.try_borrow_data()?;
    Farmer::try_deserialize(&mut data)
}

pub fn validate_bank(farm: &AccountInfo, bank: &AccountInfo) -> Result<bool> {
    let farm = parse_farm(farm)?;
    let result = farm.bank == bank.key();
    Ok(result)
}

// Assert farm's config is sane and suitable for staking
pub fn validate_farm(info: &AccountInfo) -> Result<bool> {
    let farm = parse_farm(info)?;
    let is_valid = farm.config.min_staking_period_sec == 0
        && farm.config.cooldown_period_sec == 0
        && (farm.config.unstaking_fee_lamp == 0 || farm.config.unstaking_fee_lamp >= 890880);
    Ok(is_valid)
}
