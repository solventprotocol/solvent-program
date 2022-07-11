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
  SOLVENT_CORE_TREASURY as SOLVENT_TREASURY,
} from "../common";

describe("Swapping NFTs", () => {
  const nftSymbol = "DAPE";

  let solventAuthorityAddress: anchor.web3.PublicKey;

  before(async () => {
    [solventAuthorityAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [SOLVENT_AUTHORITY_SEED],
      program.programId
    );
  });

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

    const holderKeypair = await createKeypair(provider);

    // Minting 5 NFTs and sending them the same user
    for (const i of Array(3)) {
      // Generate NFT creator keypair
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

    // Deposit 1 NFT to get some initial droplets
    const { nftMintAddress, nftMetadataAddress } = nftInfos[0];

    // NFT holder's NFT account
    const holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
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
    const holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
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
          nftMetadata: nftMetadataAddress,
          signerNftTokenAccount: holderNftTokenAccount.address,
          solventNftTokenAccount,
          destinationDropletTokenAccount: holderDropletTokenAccount.address,
        })
        .signers([holderKeypair])
        .rpc()
    );
  });

  it("can swap NFTs", async () => {
    // Looping through the NFTs and swapping one for the next
    for (const [
      index,
      {
        nftMintAddress: nftToDepositMint,
        nftMetadataAddress: nftToDepositMetadata,
        holderKeypair,
      },
    ] of nftInfos.slice(1, -1).entries()) {
      const { nftMintAddress: nftToRedeemMint } = nftInfos[index + 1];

      // NFT holder's NFT accounts
      const holderNftToDepositTokenAccount =
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          holderKeypair,
          nftToDepositMint,
          holderKeypair.publicKey
        );

      const holderNftToRedeemTokenAccount =
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          holderKeypair,
          nftToRedeemMint,
          holderKeypair.publicKey
        );

      // Solvent's NFT accounts
      const solventNftToDepositTokenAccount = await getAssociatedTokenAddress(
        nftToDepositMint,
        solventAuthorityAddress,
        true
      );

      const solventNftToRedeemTokenAccount = await getAssociatedTokenAddress(
        nftToRedeemMint,
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
        await getAssociatedTokenAddress(dropletMint, SOLVENT_TREASURY);

      let solventTreasuryDropletTokenAccountBalance = BigInt(0);
      try {
        solventTreasuryDropletTokenAccountBalance = (
          await getAccount(
            provider.connection,
            solventTreasuryDropletTokenAccount
          )
        ).amount;
      } catch (error) {
        continue;
      }

      const bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );

      // Deposit NFT for swap
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(null)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftToDepositMint,
            nftMetadata: nftToDepositMetadata,
            signerNftTokenAccount: holderNftToDepositTokenAccount.address,
            solventNftTokenAccount: solventNftToDepositTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // Redeem NFT for swap
      await provider.connection.confirmTransaction(
        await program.methods
          .redeemNft()
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftToRedeemMint,
            destinationNftTokenAccount: holderNftToRedeemTokenAccount.address,
            solventNftTokenAccount: solventNftToRedeemTokenAccount,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // Ensure user lost 0.5 droplets as swap fee
      expect(
        (
          await getAccount(
            provider.connection,
            holderDropletTokenAccount.address
          )
        ).amount
      ).to.equal(BigInt(0.5 * 100000000));

      // Ensure Solvent received fee
      expect(
        (
          await getAccount(
            provider.connection,
            solventTreasuryDropletTokenAccount
          )
        ).amount - solventTreasuryDropletTokenAccountBalance
      ).to.equal(BigInt(0.5 * 100000000));

      // Ensure user does not have the deposited NFT
      expect(
        (
          await getAccount(
            provider.connection,
            holderNftToDepositTokenAccount.address
          )
        ).amount
      ).to.equal(0n);

      // Ensure Solvent received the deposited NFT
      expect(
        (await getAccount(provider.connection, solventNftToDepositTokenAccount))
          .amount
      ).to.equal(1n);

      // Ensure user received the redeemed NFT
      expect(
        (
          await getAccount(
            provider.connection,
            holderNftToRedeemTokenAccount.address
          )
        ).amount
      ).to.equal(1n);

      // Ensure Solvent lost the redeemeed NFT
      expect(
        (await getAccount(provider.connection, solventNftToRedeemTokenAccount))
          .amount
      ).to.equal(0n);

      // Ensure counter stays same in bucket
      expect(
        (await program.account.bucketStateV3.fetch(bucketStateAddress))
          .numNftsInBucket
      ).to.equal(bucketState.numNftsInBucket);
    }
  });

  afterEach(() => {
    nftInfos.length = 0;
    dropletMint = undefined;
  });
});
