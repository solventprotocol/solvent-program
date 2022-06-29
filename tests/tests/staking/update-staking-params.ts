import * as anchor from "@project-serum/anchor";
import { createKeypair, mintNft } from "../../utils";
import {
  program,
  provider,
  getGemFarm,
  SOLVENT_ADMIN,
  BUCKET_SEED,
} from "../common";
import { beforeEach } from "mocha";
import { createMint } from "@solana/spl-token-latest";
import {
  feeAccount,
  GEM_BANK_PROG_ID,
  GEM_FARM_PROG_ID,
  RewardType,
} from "@gemworks/gem-farm-ts";
import { assert, expect } from "chai";

describe("Updating staking related params", () => {
  const nftSymbol = "DAPE";

  const gemFarm = getGemFarm(GEM_FARM_PROG_ID, GEM_BANK_PROG_ID);

  let dropletMint: anchor.web3.PublicKey,
    bucketStateAddress: anchor.web3.PublicKey;

  let farm: anchor.web3.PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        SOLVENT_ADMIN.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
  });

  beforeEach(async () => {
    // An NFT enthusiast wants to create a bucket for an NFT collection
    const userKeypair = await createKeypair(provider);

    // Create the bucket address
    const dropletMintKeypair = new anchor.web3.Keypair();
    dropletMint = dropletMintKeypair.publicKey;
    [bucketStateAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [dropletMintKeypair.publicKey.toBuffer(), BUCKET_SEED],
      program.programId
    );

    // Create the collection NFT
    const collectionCreatorKeypair = await createKeypair(provider);
    const { mint: collectionMint } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

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

    farm = farmKeypair.publicKey;
  });

  it("can update staking params", async () => {
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

    // Ensure bucket has correct contents
    const bucketState = await program.account.bucketStateV3.fetch(
      bucketStateAddress
    );
    expect(bucketState.stakingParams.gembankProgram.toBase58()).to.equal(
      GEM_BANK_PROG_ID.toBase58()
    );
    expect(bucketState.stakingParams.gemfarmProgram.toBase58()).to.equal(
      GEM_FARM_PROG_ID.toBase58()
    );
    expect(bucketState.stakingParams.gemworksFarm.toBase58()).to.equal(
      farm.toBase58()
    );
    expect(bucketState.stakingParams.gemworksFeeAccount.toBase58()).to.equal(
      feeAccount.toBase58()
    );
  });

  it("fails to update staking params with invalid farm", async () => {
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
        minStakingPeriodSec: new anchor.BN(100),
        cooldownPeriodSec: new anchor.BN(100),
        unstakingFeeLamp: new anchor.BN(100),
      }
    );

    const invalidFarm = farmKeypair.publicKey;

    try {
      await provider.connection.confirmTransaction(
        await program.methods
          .updateStakingParams()
          .accounts({
            signer: SOLVENT_ADMIN.publicKey,
            dropletMint,
            gemworksFarm: invalidFarm,
            gemfarmProgram: GEM_FARM_PROG_ID,
            gembankProgram: GEM_BANK_PROG_ID,
            gemworksFeeAccount: feeAccount,
          })
          .signers([SOLVENT_ADMIN])
          .rpc()
      );
    } catch (error) {
      assert.include(error.message, "The farm is not suitable for staking.");
      return;
    }
    expect.fail(
      "Program did not fail while updating staking params with invalid farm."
    );
  });

  it("fails to update staking params when signer is not Solvent admin", async () => {
    const randomKeypair = await createKeypair(provider);
    try {
      await program.methods
        .updateStakingParams()
        .accounts({
          signer: randomKeypair.publicKey,
          dropletMint,
          gemworksFarm: farm,
          gemfarmProgram: GEM_FARM_PROG_ID,
          gembankProgram: GEM_BANK_PROG_ID,
          gemworksFeeAccount: feeAccount,
        })
        .signers([randomKeypair])
        .rpc();
    } catch (error) {
      expect(error.message).to.contain("You do not have administrator access");
      return;
    }
    expect.fail(
      "Program did not fail while updating staking params when signer is not Solvent admin"
    );
  });

  afterEach(() => {
    dropletMint = undefined;
    bucketStateAddress = undefined;
    farm = undefined;
  });
});
