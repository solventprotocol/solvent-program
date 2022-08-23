import * as anchor from "@project-serum/anchor";
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token-latest";
import { expect } from "chai";
import { createKeypair, mintNft, verifyCollection } from "../../utils";
import {
  program,
  provider,
  SOLVENT_AUTHORITY_SEED,
  NftInfo,
  BUCKET_SEED,
  LAMPORTS_PER_DROPLET,
  SOLVENT_CORE_TREASURY as SOLVENT_TREASURY,
  SOLVENT_ADMIN,
} from "../common";

describe("Redeeming NFTs from bucket", () => {
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

  let dropletMint: anchor.web3.PublicKey,
    bucketStateAddress: anchor.web3.PublicKey;
  // One of the verified creators
  let creatorKeypair: anchor.web3.Keypair;

  const nftInfos: NftInfo[] = [];

  beforeEach(async () => {
    // An NFT enthusiast wants to create a bucket for an NFT collection
    const bucketCreatorKeypair = await createKeypair(provider);

    // Create the bucket address
    const dropletMintKeypair = new anchor.web3.Keypair();
    dropletMint = dropletMintKeypair.publicKey;
    [bucketStateAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [dropletMint.toBuffer(), BUCKET_SEED],
      program.programId
    );

    const collectionCreatorKeypair = await createKeypair(provider);
    const { mint: collectionMint } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

    const holderKeypair = await createKeypair(provider);

    // Minting 3 NFTs and sending them to a single user
    for (const i of Array(3)) {
      // Generate NFT creator and holder keypairs
      creatorKeypair = await createKeypair(provider);

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
          signer: bucketCreatorKeypair.publicKey,
          dropletMint: dropletMintKeypair.publicKey,
        })
        .signers([dropletMintKeypair, bucketCreatorKeypair])
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
  });

  it("can redeem NFTs from bucket", async () => {
    // Looping through all the NFTs and redeeming them from the bucket
    for (const { nftMintAddress, holderKeypair } of nftInfos.slice(0, -1)) {
      // NFT holder's NFT account
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftMintAddress,
        holderKeypair.publicKey
      );

      // Solvent's NFT account, a PDA owned by the Solvent program
      let solventNftTokenAccount = await getAssociatedTokenAddress(
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

      const solventTreasuryDropletTokenAccount =
        await getAssociatedTokenAddress(dropletMint, SOLVENT_TREASURY, true);

      let bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );
      const numNftsInBucket = bucketState.numNftsInBucket;

      // Redeem NFT
      await provider.connection.confirmTransaction(
        await program.methods
          .redeemNft(false)
          .accounts({
            signer: holderKeypair.publicKey,
            distributor: SOLVENT_TREASURY,
            distributorDropletTokenAccount: solventTreasuryDropletTokenAccount,
            dropletMint,
            nftMint: nftMintAddress,
            solventNftTokenAccount,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
            destinationNftTokenAccount: holderNftTokenAccount.address,
            signerDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // Ensure user burned 102 droplets
      expect(
        holderDropletTokenAccount.amount -
          (
            await getAccount(
              provider.connection,
              holderDropletTokenAccount.address
            )
          ).amount
      ).to.equal(102n * LAMPORTS_PER_DROPLET);

      // Ensure user received 1 NFT
      holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftMintAddress,
        holderKeypair.publicKey
      );
      expect(holderNftTokenAccount.amount).to.equal(1n);

      // Ensure counter decreases in bucket
      bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );
      expect(bucketState.numNftsInBucket).to.equal(numNftsInBucket - 1);
    }
  });

  afterEach(() => {
    dropletMint = undefined;
    bucketStateAddress = undefined;
    creatorKeypair = undefined;
    nftInfos.length = 0;
  });
});
