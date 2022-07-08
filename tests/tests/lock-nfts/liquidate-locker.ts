import * as anchor from "@project-serum/anchor";
import { createKeypair, verifyCollection, mintNft } from "../../utils";
import {
  SOLVENT_AUTHORITY_SEED,
  BUCKET_SEED,
  SOLVENT_ADMIN,
  DEPOSIT_SEED,
  SOLVENT_LOCKERS_TREASURY as SOLVENT_TREASURY,
  NftInfo,
  program,
  provider,
} from "../common";
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token-latest";
import { assert, expect } from "chai";

describe("Liquidating expired lockers", () => {
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

    // 5 NFTs are minted from that collection and sent to different users
    for (const i of Array(5)) {
      const creatorKeypair = await createKeypair(provider);
      const holderKeypair = await createKeypair(provider);
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
          .depositNft(null)
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

  it("can liquidate expired lockers", async () => {
    // Wait for 20 seconds
    await new Promise((r) => setTimeout(r, 20 * 1000));

    // Liquidate 2 lockers
    for (const [index, { nftMintAddress, nftMetadataAddress }] of nftInfos
      .slice(3)
      .entries()) {
      // Any user who wants to liquidate the expired lockers
      const liquidatorKeypair = await createKeypair(provider);

      // Solvent's NFT account, a PDA owned by the Solvent program
      const solventNftTokenAccount = await getAssociatedTokenAddress(
        nftMintAddress,
        solventAuthorityAddress,
        true
      );

      // The holder's droplet account
      let liquidatorDropletTokenAccount =
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          liquidatorKeypair,
          dropletMint,
          liquidatorKeypair.publicKey
        );

      let solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
        dropletMint,
        SOLVENT_TREASURY,
        true
      );

      // Liquidate locker
      try {
        await provider.connection.confirmTransaction(
          await program.methods
            .liquidateLocker()
            .accounts({
              signer: liquidatorKeypair.publicKey,
              dropletMint,
              nftMint: nftMintAddress,
              signerDropletTokenAccount: liquidatorDropletTokenAccount.address,
              solventNftTokenAccount,
              solventTreasury: SOLVENT_TREASURY,
              solventTreasuryDropletTokenAccount,
            })
            .signers([liquidatorKeypair])
            .rpc()
        );
      } catch (error) {
        console.log(error);
        throw error;
      }

      // Ensure BucketState is updated with relevant info
      const bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );
      expect(bucketState.numNftsInBucket).to.equal(4 + index);
      expect(bucketState.numNftsInLockers).to.equal(1 - index);

      // Ensure that a DepositState is created
      const [depositStateAddress] =
        await anchor.web3.PublicKey.findProgramAddress(
          [dropletMint.toBuffer(), nftMintAddress.toBuffer(), DEPOSIT_SEED],
          program.programId
        );
      const depositState = await program.account.depositState.fetch(
        depositStateAddress
      );
      expect(depositState.nftMint.toBase58()).to.equal(
        nftMintAddress.toBase58()
      );
      expect(depositState.dropletMint.toBase58()).to.equal(
        dropletMint.toBase58()
      );

      // Ensure that the bucket received the NFT
      expect(
        (await getAccount(provider.connection, solventNftTokenAccount)).amount
      ).equals(1n);

      // Ensure that the user has received liquidation reward
      liquidatorDropletTokenAccount = await getAccount(
        provider.connection,
        liquidatorDropletTokenAccount.address
      );
      assert(liquidatorDropletTokenAccount.amount > 0);

      // Ensure if there's droplets as interest added to the treasury account
      const solventTreasuryDropletTokenAccountInfo = await getAccount(
        provider.connection,
        solventTreasuryDropletTokenAccount
      );
      expect(solventTreasuryDropletTokenAccountInfo.amount).not.equal(0n);
    }
  });

  it("fails to liquidate an active locker", async () => {
    const { nftMintAddress } = nftInfos[4];

    // Any user who wants to liquidate the expired lockers
    const liquidatorKeypair = await createKeypair(provider);

    // Solvent's NFT account, a PDA owned by the Solvent program
    const solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMintAddress,
      solventAuthorityAddress,
      true
    );

    // The holder's droplet account
    let liquidatorDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      liquidatorKeypair,
      dropletMint,
      liquidatorKeypair.publicKey
    );

    let solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
      dropletMint,
      SOLVENT_TREASURY,
      true
    );

    try {
      // Lock NFT into a locker
      await program.methods
        .liquidateLocker()
        .accounts({
          signer: liquidatorKeypair.publicKey,
          dropletMint,
          nftMint: nftMintAddress,
          signerDropletTokenAccount: liquidatorDropletTokenAccount.address,
          solventNftTokenAccount,
          solventTreasury: SOLVENT_TREASURY,
          solventTreasuryDropletTokenAccount,
        })
        .signers([liquidatorKeypair])
        .rpc();
    } catch (error) {
      expect(error.message).contains(
        "The locker is still active and not up for liquidation."
      );
      return;
    }
    expect.fail("Program did not fail to liquidate an active locker.");
  });

  it("fails to liquidate locker when Solvent treasury account is invalid", async () => {
    const { nftMintAddress } = nftInfos[4];

    // Any user who wants to liquidate the expired lockers
    const liquidatorKeypair = await createKeypair(provider);

    // Solvent's NFT account, a PDA owned by the Solvent program
    const solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMintAddress,
      solventAuthorityAddress,
      true
    );

    // The holder's droplet account
    let liquidatorDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      liquidatorKeypair,
      dropletMint,
      liquidatorKeypair.publicKey
    );

    const invalidSolventTreasury = new anchor.web3.Keypair().publicKey;

    const solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
      dropletMint,
      invalidSolventTreasury
    );

    try {
      // Lock NFT into a locker
      await program.methods
        .liquidateLocker()
        .accounts({
          signer: liquidatorKeypair.publicKey,
          dropletMint,
          nftMint: nftMintAddress,
          signerDropletTokenAccount: liquidatorDropletTokenAccount.address,
          solventNftTokenAccount,
          solventTreasury: invalidSolventTreasury,
          solventTreasuryDropletTokenAccount,
        })
        .signers([liquidatorKeypair])
        .rpc();
    } catch (error) {
      expect(error.message).contains(
        "The Solvent treasury account entered by you is invalid."
      );
      return;
    }
    expect.fail(
      "Program did not fail while liquidating locker with invalid Solvent treasury."
    );
  });

  afterEach(async () => {
    nftInfos.length = 0;
    dropletMint = undefined;
    bucketStateAddress = undefined;
  });
});
