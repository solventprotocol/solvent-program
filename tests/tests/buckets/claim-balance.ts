import * as anchor from "@project-serum/anchor";
import { createKeypair, mintNft, verifyCollection } from "../../utils";
import {
  program,
  provider,
  getGemFarm,
  SOLVENT_ADMIN,
  NftInfo,
  SOLVENT_AUTHORITY_SEED,
  FARMER_AUTHORITY_SEED,
  SOLVENT_TREASURY,
} from "../common";
import { beforeEach } from "mocha";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token-latest";
import {
  feeAccount,
  GEM_BANK_PROG_ID,
  GEM_FARM_PROG_ID,
  RewardType,
} from "@gemworks/gem-farm-ts";
import { assert, expect } from "chai";

describe("Claiming balance of solvent_authority", () => {
  const nftSymbol = "DAPE";
  const gemFarm = getGemFarm(GEM_FARM_PROG_ID, GEM_BANK_PROG_ID);

  let solventAuthorityAddress: anchor.web3.PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        SOLVENT_ADMIN.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    [solventAuthorityAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [SOLVENT_AUTHORITY_SEED],
      program.programId
    );
  });

  let dropletMint: anchor.web3.PublicKey;

  let farm: anchor.web3.PublicKey, bank: anchor.web3.PublicKey;

  const nftInfos: NftInfo[] = [];

  let rewardAMint: anchor.web3.PublicKey, rewardBMint: anchor.web3.PublicKey;

  beforeEach(async () => {
    // An NFT enthusiast wants to create a bucket for an NFT collection
    const userKeypair = await createKeypair(provider);

    // Create the bucket address
    const dropletMintKeypair = new anchor.web3.Keypair();
    dropletMint = dropletMintKeypair.publicKey;

    // Create the collection NFT
    const collectionCreatorKeypair = await createKeypair(provider);
    const { mint: collectionMint } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

    // Minting 3 NFTs and sending them to 3 different users
    for (const i of Array(3)) {
      // Generate NFT creator and holder keypairs
      const holderKeypair = await createKeypair(provider);
      const creatorKeypair = await createKeypair(provider);

      // Creator mints an NFT and sends it to holder
      const { mint, metadata } = await mintNft(
        provider,
        nftSymbol,
        creatorKeypair,
        holderKeypair.publicKey,
        collectionMint
      );

      // Collection authority verifies that the NFT belongs to the collection
      await verifyCollection(
        provider,
        mint,
        collectionMint,
        collectionCreatorKeypair
      );

      // Set public vars' values
      nftInfos.push({
        nftMintAddress: mint,
        nftMetadataAddress: metadata,
        holderKeypair,
      });
    }

    // Create bucket on Solvent
    await provider.connection.confirmTransaction(
      await program.methods
        // @ts-ignore
        .createBucket({ v2: { collectionMint } })
        .accounts({
          signer: userKeypair.publicKey,
          dropletMint: dropletMint,
        })
        .signers([dropletMintKeypair, userKeypair])
        // Pass the collection mint in remaining accounts
        .remainingAccounts([
          { pubkey: collectionMint, isSigner: false, isWritable: false },
        ])
        .rpc()
    );

    // Create farm
    const bankKeypair = new anchor.web3.Keypair();
    const farmKeypair = new anchor.web3.Keypair();
    const farmManagerKeypair = await createKeypair(provider);

    rewardAMint = await createMint(
      provider.connection,
      farmManagerKeypair,
      farmManagerKeypair.publicKey,
      null,
      10 ^ 9
    );

    rewardBMint = await createMint(
      provider.connection,
      farmManagerKeypair,
      farmManagerKeypair.publicKey,
      null,
      10 ^ 9
    );

    await gemFarm.initFarm(
      farmKeypair,
      farmManagerKeypair,
      farmManagerKeypair,
      bankKeypair,
      rewardAMint,
      RewardType.Fixed,
      rewardBMint,
      RewardType.Fixed,
      {
        minStakingPeriodSec: new anchor.BN(0),
        cooldownPeriodSec: new anchor.BN(0),
        unstakingFeeLamp: new anchor.BN(1000000),
      }
    );

    bank = bankKeypair.publicKey;
    farm = farmKeypair.publicKey;

    // Fund reward pots

    const rewardASource = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      farmManagerKeypair,
      rewardAMint,
      farmManagerKeypair.publicKey
    );

    mintTo(
      provider.connection,
      farmManagerKeypair,
      rewardAMint,
      rewardASource.address,
      farmManagerKeypair,
      10000
    );

    gemFarm.fundReward(
      farm,
      rewardAMint,
      farmManagerKeypair,
      rewardASource.address,
      null,
      {
        schedule: {
          baseRate: new anchor.BN(1),
          denominator: new anchor.BN(1),
          tier1: null,
          tier2: null,
          tier3: null,
        },
        amount: new anchor.BN(100),
        durationSec: new anchor.BN(100),
      }
    );

    const rewardBSource = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      farmManagerKeypair,
      rewardBMint,
      farmManagerKeypair.publicKey
    );

    mintTo(
      provider.connection,
      farmManagerKeypair,
      rewardBMint,
      rewardBSource.address,
      farmManagerKeypair,
      10000
    );

    gemFarm.fundReward(
      farm,
      rewardBMint,
      farmManagerKeypair,
      rewardBSource.address,
      null,
      {
        schedule: {
          baseRate: new anchor.BN(1),
          denominator: new anchor.BN(1),
          tier1: null,
          tier2: null,
          tier3: null,
        },
        amount: new anchor.BN(100),
        durationSec: new anchor.BN(100),
      }
    );

    // Update staking params
    await provider.connection.confirmTransaction(
      await program.methods
        .updateStakingParams()
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          dropletMint,
          gemworksFarm: farm,
          gemfarmProgram: GEM_FARM_PROG_ID,
          gembankProgram: GEM_BANK_PROG_ID,
          gemworksFeeAccount: feeAccount,
        })
        .signers([SOLVENT_ADMIN])
        .rpc()
    );

    // Enable staking
    await provider.connection.confirmTransaction(
      await program.methods
        .setStakingEnabled(true)
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          dropletMint,
        })
        .signers([SOLVENT_ADMIN])
        .rpc()
    );

    // Looping through all the NFTs and depositing them in the bucket
    for (const {
      nftMintAddress,
      nftMetadataAddress,
      holderKeypair,
    } of nftInfos) {
      // NFT holder's NFT account
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftMintAddress,
        holderKeypair.publicKey
      );

      // Bucket's NFT account, a PDA owned by the Solvent program
      const solventNftTokenAccount = await getAssociatedTokenAddress(
        nftMintAddress,
        solventAuthorityAddress,
        true
      );

      // The holder's droplet account
      let holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        dropletMint,
        holderKeypair.publicKey
      );

      // Deposit NFT into Solvent
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(null)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftMintAddress,
            metadata: nftMetadataAddress,
            signerTokenAccount: holderNftTokenAccount.address,
            solventTokenAccount: solventNftTokenAccount,
            destinationDropletAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );
    }

    // Looping through all the NFTs and staking them
    for (const { nftMintAddress } of nftInfos) {
      const randomKeypair = await createKeypair(provider);
      const solventTokenAccount = await getAssociatedTokenAddress(
        nftMintAddress,
        solventAuthorityAddress,
        true
      );

      const [farmerAuthorityAddress] =
        await anchor.web3.PublicKey.findProgramAddress(
          [FARMER_AUTHORITY_SEED, nftMintAddress.toBuffer()],
          program.programId
        );

      const farmerTokenAccount = await getAssociatedTokenAddress(
        nftMintAddress,
        farmerAuthorityAddress,
        true
      );

      // Stake NFT
      await provider.connection.confirmTransaction(
        await program.methods
          .stakeNft()
          .accounts({
            signer: randomKeypair.publicKey,
            dropletMint,
            gembankProgram: GEM_BANK_PROG_ID,
            gemfarmProgram: GEM_FARM_PROG_ID,
            gemworksBank: bank,
            gemworksFarm: farm,
            gemworksFeeAccount: feeAccount,
            nftMint: nftMintAddress,
            solventTokenAccount,
            farmerTokenAccount,
          })
          .signers([randomKeypair])
          .rpc()
      );
    }
  });

  it("admin can claim balance of solvent_authority", async () => {
    // Looping through all the NFTs and staking them
    for (const { nftMintAddress } of nftInfos) {
      const randomKeypair = await createKeypair(provider);
      const solventTokenAccount = await getAssociatedTokenAddress(
        nftMintAddress,
        solventAuthorityAddress,
        true
      );

      const [farmerAuthorityAddress] =
        await anchor.web3.PublicKey.findProgramAddress(
          [FARMER_AUTHORITY_SEED, nftMintAddress.toBuffer()],
          program.programId
        );

      const farmerRewardATokenAccount = await getAssociatedTokenAddress(
        rewardAMint,
        farmerAuthorityAddress,
        true
      );

      const farmerRewardBTokenAccount = await getAssociatedTokenAddress(
        rewardBMint,
        farmerAuthorityAddress,
        true
      );

      // Unstake NFT
      await provider.connection.confirmTransaction(
        await program.methods
          .unstakeNft()
          .accounts({
            signer: randomKeypair.publicKey,
            dropletMint,
            gembankProgram: GEM_BANK_PROG_ID,
            gemfarmProgram: GEM_FARM_PROG_ID,
            gemworksBank: bank,
            gemworksFarm: farm,
            gemworksFeeAccount: feeAccount,
            nftMint: nftMintAddress,
            solventTokenAccount,
            gemworksRewardAMint: rewardAMint,
            gemworksRewardBMint: rewardBMint,
            farmerRewardATokenAccount,
            farmerRewardBTokenAccount,
          })
          .signers([randomKeypair])
          .rpc()
      );

      // Unstake NFT again
      await provider.connection.confirmTransaction(
        await program.methods
          .unstakeNft()
          .accounts({
            signer: randomKeypair.publicKey,
            dropletMint,
            gembankProgram: GEM_BANK_PROG_ID,
            gemfarmProgram: GEM_FARM_PROG_ID,
            gemworksBank: bank,
            gemworksFarm: farm,
            gemworksFeeAccount: feeAccount,
            nftMint: nftMintAddress,
            solventTokenAccount,
            gemworksRewardAMint: rewardAMint,
            gemworksRewardBMint: rewardBMint,
            farmerRewardATokenAccount,
            farmerRewardBTokenAccount,
          })
          .signers([randomKeypair])
          .rpc()
      );

      // Ensure solvent has the NFT now
      expect(
        (await getAccount(provider.connection, solventTokenAccount)).amount
      ).to.equal(1n);

      await provider.connection.confirmTransaction(
        await program.methods
          .claimBalance()
          .accounts({
            signer: SOLVENT_ADMIN.publicKey,
            solventTreasury: SOLVENT_TREASURY,
            solventAuthority: solventAuthorityAddress,
          })
          .signers([SOLVENT_ADMIN])
          .rpc()
      );

      const solventAuthorityLaterBalance = await provider.connection.getBalance(
        solventAuthorityAddress
      );

      // Ensure solvent_authority has min rent exemption
      assert.equal(
        solventAuthorityLaterBalance,
        await provider.connection.getMinimumBalanceForRentExemption(0)
      );
    }
  });

  afterEach(() => {
    dropletMint = undefined;
    farm = undefined;
    bank = undefined;
    nftInfos.length = 0;
    rewardAMint = undefined;
    rewardBMint = undefined;
  });
});
