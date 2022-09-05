use anchor_lang::prelude::*;

#[error_code]
pub enum SolventError {
    #[msg("The NFT collection symbol you entered is invalid.")]
    CollectionSymbolInvalid,

    #[msg("There should be 1 to 5 verified creators.")]
    VerifiedCreatorsInvalid,

    #[msg("Failed to verify if the NFT belongs to the collection.")]
    CollectionVerificationFailed,

    #[msg("Locking duration entered by you is too long.")]
    LockerDurationInvalid,

    #[msg("There are no NFTs in the bucket.")]
    BucketEmpty,

    #[msg("The locker has expired and it's up for liquidation.")]
    LockerExpired,

    #[msg("The locker is still active and not up for liquidation.")]
    LockerActive,

    #[msg("You have insufficient droplets to unlock NFT.")]
    DropletsInsufficient,

    #[msg("Interest scaler entered by you is larger than the max value.")]
    InterestScalerInvalid,

    #[msg("Lockers feature is disabled on this collection.")]
    LockersDisabled,

    #[msg("You do not have administrator access.")]
    AdminAccessUnauthorized,

    #[msg("The Solvent treasury account entered by you is invalid.")]
    SolventTreasuryInvalid,

    #[msg("The locker is not owned by you.")]
    LockerAccessUnauthorized,

    #[msg("If farming is enabled, farming params must have all 5 Pubkeys.")]
    FarmingParamsInvalid,

    #[msg("The farm is not suitable for staking.")]
    FarmConfigInvalid,

    #[msg("Auto-staking feature is disabled on this collection.")]
    StakingDisabled,

    #[msg("The staked NFT is in cooldown period, please wait and try again.")]
    StakingCooldownPending,

    #[msg("You cannot redeem NFT as part of a swap because you haven't deposited one yet.")]
    SwapNotAllowed,

    #[msg("There was an internal error while calculating fee distribution.")]
    FeeDistributionIncorrect,

    #[msg("The Solvent migration crank account entered by you is invalid.")]
    SolventMigrationCrankInvalid,

    #[msg("Cannot deposit additional NFT before closing all active swap states.")]
    DepositNotAllowed
}
