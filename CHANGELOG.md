  <h1>Changelog</h1>

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Block stolen NFTs from Solvent by checking if its `sellerFeeBasisPoints >= 9500` ([#28](https://github.com/solventprotocol/solvent-program/pull/28)).

## [1.2.0] - 2022-09-20

### Added

- 10% of the platform fees are sent to the distributor. The distributor should pass its address to the `redeem_nft` instruction ([#24](https://github.com/solventprotocol/solvent-program/pull/24)).
- Emit all data related to the instruction calls in events ([#23](https://github.com/solventprotocol/solvent-program/pull/23)).

### Changes

- Some of `migrate_droplets` instruction's input accounts are renamed ([#25](https://github.com/solventprotocol/solvent-program/pull/25)).

### Fixes

- Audit by OtterSec and Soteria, fix related bugs ([#26](https://github.com/solventprotocol/solvent-program/pull/24), [#27](https://github.com/solventprotocol/solvent-program/pull/24)).

## [1.1.0] - 2022-08-20

### Added

- Added platform fees: 2% for withdrawing NFTs and 0.5% for swapping NFTs ([#17](https://github.com/solventprotocol/solvent-program/pull/17), [#18](https://github.com/solventprotocol/solvent-program/pull/18), [#19](https://github.com/solventprotocol/solvent-program/pull/19), [#21](https://github.com/solventprotocol/solvent-program/pull/21)).
- Added `swap_nfts` instruction for swapping NFTs. A new `SwapState` PDA is created for each ongoing swap which stores whether user has deposited an NFT for swapping with another one ([#20](https://github.com/solventprotocol/solvent-program/pull/20)).

### Changes

- Renamed some input account names ([#15](https://github.com/solventprotocol/solvent-program/pull/15)).

## [1.0.0] - 2022-07-05

Initial open-source release.

### Added

- Tokenizing NFTs to droplets.
- Instant NFT loans using NFT lockers.
- Auto-staking of NFTs in bucket to [gemfarm](https://github.com/gemworks/gem-farm) staking pools.
- Audit by OtterSec.
