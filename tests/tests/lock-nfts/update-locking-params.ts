import * as anchor from "@project-serum/anchor";
import { createKeypair, mintNft } from "../../utils";
import { program, provider, BUCKET_SEED, SOLVENT_ADMIN } from "../common";
import { expect } from "chai";
import { beforeEach } from "mocha";

describe("Updating locking related params", () => {
  const nftSymbol = "DAPE";

  let dropletMint: anchor.web3.PublicKey,
    bucketStateAddress: anchor.web3.PublicKey;

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
  });

  it("can update locking params", async () => {
    // Update bucket params
    await provider.connection.confirmTransaction(
      await program.methods
        .updateLockingParams(new anchor.BN(10_000), 100)
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          dropletMint: dropletMint,
        })
        .signers([SOLVENT_ADMIN])
        .rpc()
    );

    // Fetch BucketState account and assert it has correct data
    const bucketState = await program.account.bucketStateV3.fetch(
      bucketStateAddress
    );
    expect(bucketState.maxLockerDuration.toNumber()).to.equal(10_000);
    expect(bucketState.interestScaler).to.equal(100);
  });

  it("fails to update locking params when signer is not Solvent admin", async () => {
    const maliciousActorKeypair = await createKeypair(provider);
    try {
      // Update bucket params
      await program.methods
        .updateLockingParams(new anchor.BN(10_000), 100)
        .accounts({
          signer: maliciousActorKeypair.publicKey,
          dropletMint: dropletMint,
        })
        .signers([maliciousActorKeypair])
        .rpc();
    } catch (error) {
      expect(error.message).to.contain("You do not have administrator access.");
      return;
    }
    expect.fail(
      "Program did not fail to update bucket params when signer is not Solvent admin"
    );
  });

  it("fails to update locking params when interest scaler is too large", async () => {
    try {
      // Update bucket params
      await program.methods
        .updateLockingParams(new anchor.BN(10_000), 150)
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          dropletMint: dropletMint,
        })
        .signers([SOLVENT_ADMIN])
        .rpc();
    } catch (error) {
      expect(error.message).to.contain(
        "Interest scaler entered by you is larger than the max value."
      );
      return;
    }
    expect.fail(
      "Program did not fail to update bucket params when given interest scaler is too large"
    );
  });

  afterEach(() => {
    dropletMint = undefined;
    bucketStateAddress = undefined;
  });
});
