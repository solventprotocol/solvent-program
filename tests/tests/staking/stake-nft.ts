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
  getGemBank,
} from "../common";
import { beforeEach } from "mocha";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token-latest";
import {
  feeAccount,
  findFarmerPDA,
  GEM_BANK_PROG_ID,
  GEM_FARM_PROG_ID,
  RewardType,
} from "@gemworks/gem-farm-ts";
import { assert, expect } from "chai";

describe("Staking NFT", () => {
  const nftSymbol = "DAPE";
  const gemFarm = getGemFarm(GEM_FARM_PROG_ID, GEM_BANK_PROG_ID);
  const gemBank = getGemBank(GEM_BANK_PROG_ID);

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
        .rpc()
    );

    // Create farm
    const bankKeypair = new anchor.web3.Keypair();
    const farmKeypair = new anchor.web3.Keypair();
    const farmManagerKeypair = await createKeypair(provider);
    const rewardAMint = await createMint(
      provider.connection,
      farmManagerKeypair,
      farmManagerKeypair.publicKey,
      null,
      10 ^ 9
    );
    const rewardBMint = await createMint(
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
          .depositNft(false, null)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftMintAddress,
            nftMetadata: nftMetadataAddress,
            signerNftTokenAccount: holderNftTokenAccount.address,
            solventNftTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );
    }
  });

  it("can stake NFT", async () => {
    // Looping through all the NFTs and staking them
    for (const { nftMintAddress } of nftInfos) {
      const randomKeypair = await createKeypair(provider);
      const solventNftTokenAccount = await getAssociatedTokenAddress(
        nftMintAddress,
        solventAuthorityAddress,
        true
      );

      const [farmerAuthorityAddress] =
        await anchor.web3.PublicKey.findProgramAddress(
          [FARMER_AUTHORITY_SEED, nftMintAddress.toBuffer()],
          program.programId
        );

      const farmerNftTokenAccount = await getAssociatedTokenAddress(
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
            solventNftTokenAccount,
            farmerNftTokenAccount,
          })
          .signers([randomKeypair])
          .rpc()
      );

      // Ensure solvent does not have the NFT anymore
      expect(
        (await getAccount(provider.connection, solventNftTokenAccount)).amount
      ).to.equal(0n);

      // Assert farmer account has correct info
      const [farmerAddress] = await findFarmerPDA(farm, farmerAuthorityAddress);
      const farmer = await gemFarm.fetchFarmerAcc(farmerAddress);
      expect(farmer.farm.toBase58()).to.equal(farm.toBase58());
      expect(farmer.identity.toBase58()).to.equal(
        farmerAuthorityAddress.toBase58()
      );
      assert("staked" in farmer.state);
      expect(farmer.gemsStaked.toNumber()).to.equal(1);

      // Assert vault account has correct info
      const vault = await gemBank.fetchVaultAcc(farmer.vault);
      expect(vault.locked).to.be.true;
      expect(vault.gemCount.toNumber()).to.equal(1);
    }
  });

  afterEach(() => {
    dropletMint = undefined;
    farm = undefined;
    bank = undefined;
    nftInfos.length = 0;
  });
});
