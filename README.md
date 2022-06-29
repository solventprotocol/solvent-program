<div align="center">
  <img height="170x" src="https://app.solvent.xyz/logomark_gradient.png?width=746&height=746" />

  <h1>Solvent Protocol - Financializing NFTs on Solana</h1>
</div>

Solvent is a protocol to convert the NFTs into a fixed number of fungible tokens of that collection.

- These fungible tokens a.k.a. droplets, are tradable on Serum orderbooks and AMMs across Solana
- 1 NFT --> 100 droplets --> 1 NFT
- Droplets are unique to each collection, and every NFT mints the same number of droplets of that collection.
- Droplets enables instant liquidity, and DeFi applications such as LPing, lending, and long/shorts to illiquid NFTs.
- Read our litepaper [here](https://drive.google.com/file/d/1HwybfOLGkQ_HAo5zBl2Hf19yTnz4rtQH/view).
- NFT lockers is a functionality to mint depositor some droplets as a debt but locking that NFT so that it is not available in the open bucket. User can claim their locked NFTs by unlocking them and paying back the droplets debt + some interest within a duration. Failure to unlock the NFT within the duration specified results in locked NFT getting liquidated.

## Protocol functionality

These are the following functionality that the users can perform with the protocol:

- Create a bucket on Solvent for an NFT collection
- Mint 100 droplets by depositing the NFT into its suitable bucket
- Burn 100 droplets to claim an NFT from the bucket

### NFT Lockers

NFT lockers are vaults that users can use to lock their NFT for a certain duration **D** into Solvent and unlock instant liquidity for them. Within that duration, the users can pay back the debt and interest and can claim their NFT back. Users can select any duration up to a certain duration limit **Dmax**. The duration can be mentioned in the number of hours. If the users default to make the payment of debt and interest, they’re liquidated. If a user unlocks the NFT before they’re about to be liquidated, they only pay interest for the duration for which the NFT was locked. The interest that is paid is accumulated in an interest vault account.

The formula for droplets minted for an NFT that gets locked is shown as below:

<div align="center">
  <img height="170x" src="https://hjjoexfazvdsdeykmsvc.supabase.co/storage/v1/object/public/solvent-internal-img-assets/nft_locker_principal.jpg" />
</div>

The formula for the interest that the user ends up paying for unlocking the NFT is shown as below:

<div align="center">
  <img height="170x" src="https://hjjoexfazvdsdeykmsvc.supabase.co/storage/v1/object/public/solvent-internal-img-assets/nft_locker_interest_with_cooldown.jpg" />
</div>

## Function calls

| Function           | Description                                                       |
| :----------------- | :---------------------------------------------------------------- |
| `create_bucket`    | Create a bucket for an NFT collection on Solvent                  |
| `deposit_nft`      | Deposit an NFT into a bucket to mint 100 droplets                 |
| `redeem_nft`       | Burn 100 droplets to claim the NFT from the bucket                |
| `lock_nft`         | Lock an NFT for a duration to mint droplets as a debt             |
| `unlock_nft`       | Unlock a locked NFT by paying back the droplets debt + interest   |
| `liquidate_locker` | Liquidate a locked NFT that is overdue unlocking by the depositor |

## State structs

### BucketStates

#### BucketState

PDA to store the details of an NFT collection details on-chain. Represents a unique bucket for an NFT collection.

| Fields                   | Description                                                                          | Type   |
| :----------------------- | :----------------------------------------------------------------------------------- | :----- |
| `bump`                   | The canonical bump for the BucketState PDA                                           | u8     |
| `droplet_mint`           | The public key address of the droplet token for the NFT collection                   | Pubkey |
| `symbol`                 | The symbol value present in the metadata of the NFT assets                           | String |
| `nft_collection_creator` | The public key address of the NFT creator in the metadata with verified value = true | Pubkey |

#### BucketStateV2

PDA to store the details of an NFT collection details on-chain. Represents a unique bucket for an NFT collection.
<strong>What's new: </strong> A bucket of an NFT collection can have multiple verified NFT verified creators. Useful in cases where there are multiple candy machine IDs for a single collection.

| Fields              | Description                                                                                     | Type          |
| :------------------ | :---------------------------------------------------------------------------------------------- | :------------ |
| `bump`              | The canonical bump for the BucketStateV2 PDA                                                    | u8            |
| `droplet_mint`      | The public key address of the droplet token for the NFT collection                              | Pubkey        |
| `symbol`            | The symbol value present in the metadata of the NFT assets                                      | String        |
| `verified_creators` | A vector of public key addresses of the NFT creators in the metadata with verified value = true | Vec< Pubkey > |

#### BucketStateV3

PDA to store the details of an NFT collection details on-chain. Represents a unique bucket for an NFT collection.
<strong>What's new: </strong>

- The verification details such as NFT symbol in the metadata + list of verified creators is now stored in a separate enum named CollectionInfo. CollectionInfo also accounts for cases where the NFT collection can be represented using a unique collectionMint as per Metaplex v1.1 metadata standard.
- Additional variables required for NFT lockers

| Fields                | Description                                                                                                                                                                                   | Type           |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------- |
| `bump`                | The canonical bump for the BucketStateV3 PDA                                                                                                                                                  | u8             |
| `droplet_mint`        | The public key address of the droplet token for the NFT collection                                                                                                                            | Pubkey         |
| `collection_info`     | The enum value representing verification details of the NFT collection                                                                                                                        | CollectionInfo |
| `is_lockers_enabled`  | A boolean variable representing whether NFT lockers feature is enabled for a bucket of an NFT collection. False by default. Can only be updated by Solvent team. Decentralized in the future. | bool           |
| `max_locker_duration` | The max duration in seconds for which an NFT can be locked into the locker of this bucket                                                                                                     | u64            |
| `num_nfts_in_bucket`  | The number of NFTs deposited into the bucket                                                                                                                                                  | u16            |
| `num_nfts_in_locker`  | The number of NFTs locked into a locker of the bucket                                                                                                                                         | u16            |
| `interest_scaler`     | The % value multiplier to scale the interest payable for NFT lockers functionality. Range: (0,100]                                                                                            | u8             |

### DepositState

PDA to store the details of an NFT that is deposited into a bucket. Every NFT deposited into Solvent will now have its own on-chain state representing the deposit transaction.

| Fields         | Description                                                        | Type   |
| :------------- | :----------------------------------------------------------------- | :----- |
| `bump`         | The canonical bump for the DepositState PDA                        | u8     |
| `droplet_mint` | The public key address of the droplet token for the NFT collection | Pubkey |
| `nft_mint`     | The public key address of the NFT asset deposited into the bucket  | String |

### LockerState

PDA to store the details of an NFT that is locked into a locker of the bucket. Every NFT locked into lockers of the bucket will have its own on-chain state representing the locked transaction.

| Fields                 | Description                                                              | Type   |
| :--------------------- | :----------------------------------------------------------------------- | :----- |
| `droplet_mint`         | The public key address of the droplet token for the NFT collection       | Pubkey |
| `depositor`            | The public key address of the original user who has locked the NFT asset | Pubkey |
| `nft_mint`             | The public key address of the NFT asset deposited into the bucket        | String |
| `creation_timestamp`   | The unix timestamp when the NFT got locked into the locker               | u64    |
| `duration`             | The duration in seconds for which the NFT is locked into the locker      | u64    |
| `principal_amount`     | The amount of droplets minted to the user as a debt for locking the NFT  | u64    |
| `max_interest_payable` | The maximum interest payable by the depositor while unlocking the NFT    | u64    |

## Queries

Thank you for your interest in Solvent smart-contracts!
Please email us at: [mmdhrumil@solventprotocol.com](emailto:mmdhrumil@solventprotocol.com) for queries and more.

### Thanks ❤️
