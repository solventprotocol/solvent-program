import * as anchor from "@project-serum/anchor";
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token-latest";
import { expect } from "chai";
import { createKeypair, mintNft, verifyCollection } from "../../utils";
import {
  program,
  provider,
  SOLVENT_AUTHORITY_SEED,
  NftInfo,
  BUCKET_SEED,
  SOLVENT_ADMIN,
} from "../common";

describe("Migrating NFTs into bucket", () => {
  const nftSymbol = "DAPE";

  let solventAuthorityAddress: anchor.web3.PublicKey;

  before(async () => {
    [solventAuthorityAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [SOLVENT_AUTHORITY_SEED],
      program.programId
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        SOLVENT_ADMIN.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
  });

  // One of the verified creators
  let creatorKeypair: anchor.web3.Keypair;

  const nftInfos: NftInfo[] = [];
  let dropletMint: anchor.web3.PublicKey,
    bucketStateAddress: anchor.web3.PublicKey;

  beforeEach(async () => {
    const collectionCreatorKeypair = await createKeypair(provider);
    const { mint: collectionMint } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

    // Minting 3 NFTs and sending them to Solvent admin
    for (const i of Array(3)) {
      // Generate NFT creator keypairs
      creatorKeypair = await createKeypair(provider);

      // Creator mints an NFT and sends it to holder
      const { mint, metadata } = await mintNft(
        provider,
        nftSymbol,
        creatorKeypair,
        SOLVENT_ADMIN.publicKey,
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
        holderKeypair: SOLVENT_ADMIN,
      });
    }

    // An NFT enthusiast wants to create a bucket for an NFT collection
    const bucketCreatorKeypair = await createKeypair(provider);

    // Create the bucket address
    const dropletMintKeypair = new anchor.web3.Keypair();
    dropletMint = dropletMintKeypair.publicKey;
    [bucketStateAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [dropletMint.toBuffer(), BUCKET_SEED],
      program.programId
    );

    // Create bucket on Solvent
    await provider.connection.confirmTransaction(
      await program.methods
        // @ts-ignore
        .createBucket({ v2: { collectionMint } })
        .accounts({
          signer: bucketCreatorKeypair.publicKey,
          dropletMint: dropletMintKeypair.publicKey,
        })
        .signers([dropletMintKeypair, bucketCreatorKeypair])
        .rpc()
    );
  });

  it("can migrate NFTs into bucket", async () => {
    // Looping through all the NFTs and depositing them in the bucket
    for (const { nftMintAddress, nftMetadataAddress } of nftInfos) {
      let adminNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        SOLVENT_ADMIN,
        nftMintAddress,
        SOLVENT_ADMIN.publicKey
      );

      // Bucket's NFT account, a PDA owned by the Solvent program
      const solventNftTokenAccount = await getAssociatedTokenAddress(
        nftMintAddress,
        solventAuthorityAddress,
        true
      );

      let bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );
      const numNftsInBucket = bucketState.numNftsInBucket;

      // Deposit NFT into Solvent
      await provider.connection.confirmTransaction(
        await program.methods
          .migrateNft(null)
          .accounts({
            signer: SOLVENT_ADMIN.publicKey,
            dropletMint,
            nftMint: nftMintAddress,
            nftMetadata: nftMetadataAddress,
            signerNftTokenAccount: adminNftTokenAccount.address,
            solventNftTokenAccount,
          })
          .signers([SOLVENT_ADMIN])
          .rpc()
      );

      // Ensure user did not receive droplets for the NFT deposited
      const adminDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        SOLVENT_ADMIN,
        dropletMint,
        SOLVENT_ADMIN.publicKey
      );
      expect(
        (
          await getAccount(
            provider.connection,
            adminDropletTokenAccount.address
          )
        ).amount
      ).to.equal(0n);

      // Ensure user does not have the deposited NFT
      expect(
        (await getAccount(provider.connection, adminNftTokenAccount.address))
          .amount
      ).to.equal(0n);

      // Ensure Solvent received the deposited NFT
      const solventNftTokenAccountInfo = await getAccount(
        provider.connection,
        solventNftTokenAccount
      );
      expect(solventNftTokenAccountInfo.amount).to.equal(1n);

      // Ensure counter increases in bucket
      bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );
      expect(bucketState.numNftsInBucket).to.equal(numNftsInBucket + 1);
    }
  });

  it("fails to migrate NFT when signer is not Solvent admin", async () => {
    // Looping through all the NFTs and depositing them in the bucket
    const { nftMintAddress, nftMetadataAddress } = nftInfos[0];

    // Transfer the NFT to a random user
    const randomKeypair = await createKeypair(provider);
    let userNftTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        randomKeypair,
        nftMintAddress,
        randomKeypair.publicKey
      )
    ).address;

    await transfer(
      provider.connection,
      randomKeypair,
      await getAssociatedTokenAddress(nftMintAddress, SOLVENT_ADMIN.publicKey),
      userNftTokenAccount,
      SOLVENT_ADMIN,
      1
    );

    // Bucket's NFT account, a PDA owned by the Solvent program
    const solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMintAddress,
      solventAuthorityAddress,
      true
    );

    // Deposit NFT into Solvent
    try {
      await program.methods
        .migrateNft(null)
        .accounts({
          signer: randomKeypair.publicKey,
          dropletMint,
          nftMint: nftMintAddress,
          nftMetadata: nftMetadataAddress,
          signerNftTokenAccount: userNftTokenAccount,
          solventNftTokenAccount,
        })
        .signers([randomKeypair])
        .rpc();
    } catch (error) {
      expect(error.message).to.contain("You do not have administrator access.");
      return;
    }
    expect.fail(
      "Program did not fail while migrating NFT when signer is not Solvent admin"
    );
  });

  afterEach(() => {
    creatorKeypair = undefined;
    nftInfos.length = 0;
    dropletMint = undefined;
    bucketStateAddress = undefined;
  });
});
