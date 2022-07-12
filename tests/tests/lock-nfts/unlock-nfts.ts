import * as anchor from "@project-serum/anchor";
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token-latest";
import { assert, expect } from "chai";
import { createKeypair, mintNft, verifyCollection } from "../../utils";
import {
  program,
  provider,
  BUCKET_SEED,
  SOLVENT_AUTHORITY_SEED,
  NftInfo,
  SOLVENT_ADMIN,
  SOLVENT_LOCKERS_TREASURY as SOLVENT_TREASURY,
} from "../common";

describe("Unlocking NFTs from lockers", () => {
  const nftSymbol = "DAPE";

  let solventAuthorityAddress: anchor.web3.PublicKey;

  before(async () => {
    // Generate Solvent authority PDA
    [solventAuthorityAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [SOLVENT_AUTHORITY_SEED],
      program.programId
    );
  });

  const nftInfos: NftInfo[] = [];
  let dropletMint: anchor.web3.PublicKey;
  let bucketStateAddress: anchor.web3.PublicKey;

  beforeEach(async () => {
    // Create the collection NFT
    const collectionCreatorKeypair = await createKeypair(provider);
    const { mint: collectionMint } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

    // 5 NFTs are minted from that collection and sent to a single user
    const holderKeypair = await createKeypair(provider);
    for (const i of Array(5)) {
      const creatorKeypair = await createKeypair(provider);
      const { metadata: nftMetadataAddress, mint: nftMintAddress } =
        await mintNft(
          provider,
          nftSymbol,
          creatorKeypair,
          holderKeypair.publicKey,
          collectionMint
        );

      // Collection authority verifies that the NFT belongs to the collection
      await verifyCollection(
        provider,
        nftMintAddress,
        collectionMint,
        collectionCreatorKeypair
      );

      // Set public vars' values
      nftInfos.push({
        nftMintAddress,
        nftMetadataAddress,
        holderKeypair,
      });
    }

    const bucketCreatorKeypair = await createKeypair(provider);
    const dropletMintKeypair = await createKeypair(provider);
    dropletMint = dropletMintKeypair.publicKey;

    [bucketStateAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [dropletMintKeypair.publicKey.toBuffer(), BUCKET_SEED],
      program.programId
    );

    // Create bucket on Solvent
    await provider.connection.confirmTransaction(
      await program.methods
        // @ts-ignore
        .createBucket({ v2: { collectionMint } })
        .accounts({
          signer: bucketCreatorKeypair.publicKey,
          dropletMint,
        })
        .signers([dropletMintKeypair, bucketCreatorKeypair])
        .rpc()
    );

    // Update bucket params
    await provider.connection.confirmTransaction(
      await program.methods
        .updateLockingParams(new anchor.BN(10_000), 100)
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          dropletMint,
        })
        .signers([SOLVENT_ADMIN])
        .rpc()
    );

    // Enable lockers
    await provider.connection.confirmTransaction(
      await program.methods
        .setLockingEnabled(true)
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          dropletMint,
        })
        .signers([SOLVENT_ADMIN])
        .rpc()
    );

    // Depositing 3 NFTs into the bucket
    for (const {
      nftMintAddress,
      nftMetadataAddress,
      holderKeypair,
    } of nftInfos.slice(0, 3)) {
      // NFT holder's NFT account
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftMintAddress,
        holderKeypair.publicKey
      );

      // Bucket's NFT account, a PDA owned by the Solvent program
      let solventNftTokenAccount = await getAssociatedTokenAddress(
        nftMintAddress,
        solventAuthorityAddress,
        true
      );

      // The holder's droplet account
      let holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        dropletMintKeypair.publicKey,
        holderKeypair.publicKey
      );

      // Deposit NFT into Solvent
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(false, null)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint: dropletMintKeypair.publicKey,
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

    // Locking 2 NFTs
    for (const {
      nftMintAddress,
      nftMetadataAddress,
      holderKeypair,
    } of nftInfos.slice(3, 5)) {
      // NFT holder's NFT account
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftMintAddress,
        holderKeypair.publicKey
      );

      // Solvent's NFT account, a PDA owned by the Solvent program
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

      // Lock NFT into a locker
      await provider.connection.confirmTransaction(
        await program.methods
          .lockNft(new anchor.BN(10), null)
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

  it("can unlock NFTs from lockers", async () => {
    // Unlock 2 NFTs from locker
    for (const [index, { nftMintAddress, holderKeypair }] of nftInfos
      .slice(3)
      .entries()) {
      // NFT holder's NFT account
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftMintAddress,
        holderKeypair.publicKey
      );

      // Solvent's NFT account, a PDA owned by the Solvent program
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

      const holderDropletBalance = holderDropletTokenAccount.amount;

      let solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
        dropletMint,
        SOLVENT_TREASURY,
        true
      );

      // Lock NFT into a locker
      await provider.connection.confirmTransaction(
        await program.methods
          .unlockNft()
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftMintAddress,
            signerDropletTokenAccount: holderDropletTokenAccount.address,
            solventNftTokenAccount,
            destinationNftTokenAccount: holderNftTokenAccount.address,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // Ensure if the bucketState and lockerState is updated with relevant info
      const bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );
      expect(bucketState.numNftsInBucket).to.equal(3);
      expect(bucketState.numNftsInLockers).to.equal(1 - index);

      // Ensure that the user has 0 droplets after repayment
      holderDropletTokenAccount = await getAccount(
        provider.connection,
        holderDropletTokenAccount.address
      );
      assert(holderDropletTokenAccount.amount < holderDropletBalance);

      // Ensure user gets back the unlocked NFT
      holderNftTokenAccount = await getAccount(
        provider.connection,
        holderNftTokenAccount.address
      );
      expect(holderNftTokenAccount.amount).to.equal(1n);

      // Ensure if there's droplets as interest added to the treasury account
      const solventTreasuryDropletAccountInfo = await getAccount(
        provider.connection,
        solventTreasuryDropletTokenAccount
      );
      expect(solventTreasuryDropletAccountInfo.amount).not.equal(0n);
    }
  });

  it("fails to unlock NFT when Solvent treasury account is invalid", async () => {
    const { nftMintAddress, holderKeypair } = nftInfos[4];

    // NFT holder's NFT account
    let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      holderKeypair,
      nftMintAddress,
      holderKeypair.publicKey
    );

    // Solvent's NFT account, a PDA owned by the Solvent program
    const solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMintAddress,
      solventAuthorityAddress,
      true
    );

    // The holder's droplet account
    const holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      holderKeypair,
      dropletMint,
      holderKeypair.publicKey
    );

    const invalidSolventTreasury = new anchor.web3.Keypair().publicKey;

    const solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
      dropletMint,
      invalidSolventTreasury
    );

    try {
      // Lock NFT into a locker
      await program.methods
        .unlockNft()
        .accounts({
          signer: holderKeypair.publicKey,
          dropletMint,
          nftMint: nftMintAddress,
          signerDropletTokenAccount: holderDropletTokenAccount.address,
          solventNftTokenAccount,
          destinationNftTokenAccount: holderNftTokenAccount.address,
          solventTreasury: invalidSolventTreasury,
          solventTreasuryDropletTokenAccount,
        })
        .signers([holderKeypair])
        .rpc();
    } catch (error) {
      assert.include(
        error.message,
        "The Solvent treasury account entered by you is invalid."
      );
      return;
    }
    expect.fail(
      "Program did not fail while unlocking NFT with invalid Solvent treasury."
    );
  });

  it("fails to unlock NFT when the signer is not the depositor", async () => {
    let { nftMintAddress, nftMetadataAddress } = nftInfos[3];

    const maliciousActorKeypair = await createKeypair(provider);

    // NFT holder's NFT account
    const holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      maliciousActorKeypair,
      nftMintAddress,
      maliciousActorKeypair.publicKey
    );

    // Solvent's NFT account, a PDA owned by the Solvent program
    const solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMintAddress,
      solventAuthorityAddress,
      true
    );

    // The holder's droplet account
    const holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      maliciousActorKeypair,
      dropletMint,
      maliciousActorKeypair.publicKey
    );

    const solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
      dropletMint,
      SOLVENT_TREASURY,
      true
    );

    try {
      // Unlock NFT
      await program.methods
        .unlockNft()
        .accounts({
          signer: maliciousActorKeypair.publicKey,
          dropletMint,
          nftMint: nftMintAddress,
          signerDropletTokenAccount: holderDropletTokenAccount.address,
          solventNftTokenAccount,
          destinationNftTokenAccount: holderNftTokenAccount.address,
          solventTreasury: SOLVENT_TREASURY,
          solventTreasuryDropletTokenAccount,
        })
        .signers([maliciousActorKeypair])
        .rpc();
    } catch (error) {
      assert.include(error.message, "The locker is not owned by you.");
      return;
    }
    expect.fail("Program did not fail while locking NFT with invalid signer");
  });

  it("fails to unlock NFT when locker has expired", async () => {
    // Wait for 20 seconds
    await new Promise((r) => setTimeout(r, 20 * 1000));

    const { nftMintAddress, holderKeypair } = nftInfos[4];

    // NFT holder's NFT account
    let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      holderKeypair,
      nftMintAddress,
      holderKeypair.publicKey
    );

    // Solvent's NFT account, a PDA owned by the Solvent program
    const solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMintAddress,
      solventAuthorityAddress,
      true
    );

    // The holder's droplet account
    const holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      holderKeypair,
      dropletMint,
      holderKeypair.publicKey
    );

    const solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
      dropletMint,
      SOLVENT_TREASURY,
      true
    );

    try {
      // Unlock NFT
      await program.methods
        .unlockNft()
        .accounts({
          signer: holderKeypair.publicKey,
          dropletMint,
          nftMint: nftMintAddress,
          signerDropletTokenAccount: holderDropletTokenAccount.address,
          solventNftTokenAccount: solventNftTokenAccount,
          destinationNftTokenAccount: holderNftTokenAccount.address,
          solventTreasury: SOLVENT_TREASURY,
          solventTreasuryDropletTokenAccount,
        })
        .signers([holderKeypair])
        .rpc();
    } catch (error) {
      assert.include(
        error.message,
        "The locker has expired and it's up for liquidation."
      );
      return;
    }
    expect.fail("Program did not fail while unlocking an expired locker.");
  });

  afterEach(() => {
    dropletMint = undefined;
    nftInfos.length = 0;
    bucketStateAddress = undefined;
  });
});
