import * as anchor from "@project-serum/anchor";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token-latest";
import { assert, expect } from "chai";
import {
  createKeypair,
  getBalance,
  mintNft,
  verifyCollection,
} from "../../utils";
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
    for (const i of Array(5)) {
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

    // Deposit 3 NFTs to get some initial droplets
    for (const {
      nftMintAddress: nftToDepositMint,
      nftMetadataAddress: nftToDepositMetadata,
      holderKeypair,
    } of nftInfos.slice(0, 3)) {
      // NFT holder's NFT accounts
      const holderNftToDepositTokenAccount =
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          holderKeypair,
          nftToDepositMint,
          holderKeypair.publicKey
        );

      // Solvent's NFT accounts
      const solventNftToDepositTokenAccount = await getAssociatedTokenAddress(
        nftToDepositMint,
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

      // Deposit NFT
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(false, null)
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
    }
  });

  it("can swap NFTs", async () => {
    // Looping through the NFTs and swapping one that's already in the bucket
    for (const [
      index,
      {
        nftMintAddress: nftToDepositMint,
        nftMetadataAddress: nftToDepositMetadata,
        holderKeypair,
      },
    ] of nftInfos.slice(3).entries()) {
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
      const solventTreasuryDropletTokenAccountBalance = await getBalance(
        provider.connection,
        solventTreasuryDropletTokenAccount
      );

      const bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );

      // Deposit NFT for swap
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(true, null)
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
          .redeemNft(true)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            distributor: SOLVENT_TREASURY,
            distributorDropletTokenAccount: solventTreasuryDropletTokenAccount,
            nftMint: nftToRedeemMint,
            destinationNftTokenAccount: holderNftToRedeemTokenAccount.address,
            solventNftTokenAccount: solventNftToRedeemTokenAccount,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
            signerDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // Ensure user lost 0.5 droplets as swap fee
      expect(
        holderDropletTokenAccount.amount -
          (await getBalance(
            provider.connection,
            holderDropletTokenAccount.address
          ))
      ).to.equal(BigInt(0.5 * 100000000));

      // Ensure Solvent received fee
      expect(
        (await getBalance(
          provider.connection,
          solventTreasuryDropletTokenAccount
        )) - solventTreasuryDropletTokenAccountBalance
      ).to.equal(BigInt(0.5 * 100000000));

      // Ensure user does not have the deposited NFT
      expect(
        await getBalance(
          provider.connection,
          holderNftToDepositTokenAccount.address
        )
      ).to.equal(0n);

      // Ensure Solvent received the deposited NFT
      expect(
        await getBalance(provider.connection, solventNftToDepositTokenAccount)
      ).to.equal(1n);

      // Ensure user received the redeemed NFT
      expect(
        await getBalance(
          provider.connection,
          holderNftToRedeemTokenAccount.address
        )
      ).to.equal(1n);

      // Ensure Solvent lost the redeemeed NFT
      expect(
        await getBalance(provider.connection, solventNftToRedeemTokenAccount)
      ).to.equal(0n);

      // Ensure counter stays same in bucket
      expect(
        (await program.account.bucketStateV3.fetch(bucketStateAddress))
          .numNftsInBucket
      ).to.equal(bucketState.numNftsInBucket);
    }
  });

  it("can deposit NFT with swap=true", async () => {
    for (const {
      nftMintAddress: nftToDepositMint,
      nftMetadataAddress: nftToDepositMetadata,
      holderKeypair,
    } of nftInfos.slice(3)) {
      // NFT holder's NFT accounts
      const holderNftToDepositTokenAccount =
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          holderKeypair,
          nftToDepositMint,
          holderKeypair.publicKey
        );

      // Solvent's NFT accounts
      const solventNftToDepositTokenAccount = await getAssociatedTokenAddress(
        nftToDepositMint,
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
      const solventTreasuryDropletTokenAccountBalance = await getBalance(
        provider.connection,
        solventNftToDepositTokenAccount
      );

      const bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );

      // Deposit NFT for swap
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(true, null)
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

      // Ensure user's droplets balance is unchanged
      expect(
        (await getBalance(
          provider.connection,
          holderDropletTokenAccount.address
        )) - holderDropletTokenAccount.amount
      ).to.equal(0n);

      // Ensure Solvent's droplets balance is unchanged
      expect(
        (await getBalance(
          provider.connection,
          solventTreasuryDropletTokenAccount
        )) - solventTreasuryDropletTokenAccountBalance
      ).to.equal(0n);

      // Ensure user does not have the deposited NFT
      expect(
        await getBalance(
          provider.connection,
          holderNftToDepositTokenAccount.address
        )
      ).to.equal(0n);

      // Ensure Solvent received the deposited NFT
      expect(
        await getBalance(provider.connection, solventNftToDepositTokenAccount)
      ).to.equal(1n);

      // Ensure counter increases in bucket
      expect(
        (await program.account.bucketStateV3.fetch(bucketStateAddress))
          .numNftsInBucket
      ).to.equal(bucketState.numNftsInBucket + 1);
    }
  });

  it("can redeem NFT with swap=false after depositing one with swap=true", async () => {
    // Looping through the NFTs and swapping one for the next
    for (const [
      index,
      {
        nftMintAddress: nftToDepositMint,
        nftMetadataAddress: nftToDepositMetadata,
        holderKeypair,
      },
    ] of nftInfos.slice(3).entries()) {
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
      const solventTreasuryDropletTokenAccountBalance = await getBalance(
        provider.connection,
        solventTreasuryDropletTokenAccount
      );

      const bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );

      // Deposit NFT for swap
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(true, null)
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

      // Redeem NFT
      await provider.connection.confirmTransaction(
        await program.methods
          .redeemNft(false)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            distributor: SOLVENT_TREASURY,
            distributorDropletTokenAccount: solventTreasuryDropletTokenAccount,
            nftMint: nftToRedeemMint,
            destinationNftTokenAccount: holderNftToRedeemTokenAccount.address,
            solventNftTokenAccount: solventNftToRedeemTokenAccount,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
            signerDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // Ensure user lost 102 droplets
      expect(
        holderDropletTokenAccount.amount -
          (await getBalance(
            provider.connection,
            holderDropletTokenAccount.address
          ))
      ).to.equal(BigInt(102 * 100000000));

      // Ensure Solvent received fee
      expect(
        (await getBalance(
          provider.connection,
          solventTreasuryDropletTokenAccount
        )) - solventTreasuryDropletTokenAccountBalance
      ).to.equal(BigInt(2 * 100000000));

      // Ensure user does not have the deposited NFT
      expect(
        await getBalance(
          provider.connection,
          holderNftToDepositTokenAccount.address
        )
      ).to.equal(0n);

      // Ensure Solvent received the deposited NFT
      expect(
        await getBalance(provider.connection, solventNftToDepositTokenAccount)
      ).to.equal(1n);

      // Ensure user received the redeemed NFT
      expect(
        await getBalance(
          provider.connection,
          holderNftToRedeemTokenAccount.address
        )
      ).to.equal(1n);

      // Ensure Solvent lost the redeemeed NFT
      expect(
        await getBalance(provider.connection, solventNftToRedeemTokenAccount)
      ).to.equal(0n);

      // Ensure counter stays same in bucket
      expect(
        (await program.account.bucketStateV3.fetch(bucketStateAddress))
          .numNftsInBucket
      ).to.equal(bucketState.numNftsInBucket);
    }
  });

  it("fails to redeem NFT with swap=true after depositing one with swap=false", async () => {
    const {
      nftMintAddress: nftToDepositMint,
      nftMetadataAddress: nftToDepositMetadata,
      holderKeypair,
    } = nftInfos[3];

    const { nftMintAddress: nftToRedeemMint } = nftInfos[1];

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

    const solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
      dropletMint,
      SOLVENT_TREASURY
    );

    // Deposit NFT without swap
    await provider.connection.confirmTransaction(
      await program.methods
        .depositNft(false, null)
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

    // Redeem NFT with swap
    try {
      await program.methods
        .redeemNft(true)
        .accounts({
          signer: holderKeypair.publicKey,
          dropletMint,
          distributor: SOLVENT_TREASURY,
          distributorDropletTokenAccount: solventTreasuryDropletTokenAccount,
          nftMint: nftToRedeemMint,
          destinationNftTokenAccount: holderNftToRedeemTokenAccount.address,
          solventNftTokenAccount: solventNftToRedeemTokenAccount,
          solventTreasury: SOLVENT_TREASURY,
          solventTreasuryDropletTokenAccount,
          signerDropletTokenAccount: holderDropletTokenAccount.address,
        })
        .signers([holderKeypair])
        .rpc();
    } catch (error) {
      assert.include(
        error.message,
        "You cannot redeem NFT as part of a swap because you haven't deposited one yet."
      );
      return;
    }
    expect.fail(
      "Program did not fail while doing redeem-with-swap after deposit-without-swap."
    );
  });

  afterEach(() => {
    nftInfos.length = 0;
    dropletMint = undefined;
  });
});
