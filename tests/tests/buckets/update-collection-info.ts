import * as anchor from "@project-serum/anchor";
import { createKeypair, mintNft, verifyCollection } from "../../utils";
import {
  program,
  provider,
  BUCKET_SEED,
  SOLVENT_ADMIN,
  NftInfo,
  SOLVENT_AUTHORITY_SEED,
  SOLVENT_CORE_TREASURY,
} from "../common";
import { expect } from "chai";
import { beforeEach } from "mocha";
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token-latest";

describe("Updating collection info", () => {
  const nftSymbol = "DAPE";

  let dropletMint: anchor.web3.PublicKey,
    bucketStateAddress: anchor.web3.PublicKey;

  let nftInfo: NftInfo;

  let solventAuthorityAddress: anchor.web3.PublicKey;

  before(async () => {
    [solventAuthorityAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [SOLVENT_AUTHORITY_SEED],
      program.programId
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

    // Mint an NFT from that collection
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
    await verifyCollection(
      provider,
      nftMintAddress,
      collectionMint,
      collectionCreatorKeypair
    );
    nftInfo = {
      nftMintAddress,
      nftMetadataAddress,
      holderKeypair,
    };

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

  it("can update collection info", async () => {
    // Create a new collection NFT
    const collectionCreatorKeypair = await createKeypair(provider);
    const { mint: collectionMint } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

    // Update collection info
    await provider.connection.confirmTransaction(
      await program.methods
        // @ts-ignore
        .updateCollectionInfo({ v2: { collectionMint } })
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
    // @ts-ignore
    expect(bucketState.collectionInfo.v2.collectionMint.toBase58()).to.equal(
      collectionMint.toBase58()
    );
  });

  it("can deposit and redeem after updating collection info", async () => {
    // Deposit an NFT of collection mint 1
    const {
      nftMintAddress: nftMint1,
      nftMetadataAddress: nftMetadata1,
      holderKeypair,
    } = nftInfo;
    let holderNftTokenAccount = await getAssociatedTokenAddress(
      nftMint1,
      holderKeypair.publicKey
    );
    let solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMint1,
      solventAuthorityAddress,
      true
    );
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
          nftMint: nftMint1,
          nftMetadata: nftMetadata1,
          signerNftTokenAccount: holderNftTokenAccount,
          solventNftTokenAccount,
          destinationDropletTokenAccount: holderDropletTokenAccount.address,
        })
        .signers([holderKeypair])
        .rpc()
    );

    // Ensure user received 100 droplets for the NFT deposited
    holderDropletTokenAccount = await getAccount(
      provider.connection,
      holderDropletTokenAccount.address
    );
    expect(holderDropletTokenAccount.amount).to.equal(BigInt(100 * 100000000));

    // Create a new collection mint: collection mint 2
    const collectionCreatorKeypair = await createKeypair(provider);
    const { mint: collectionMint2 } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

    // Mint an NFT from collection mint 2
    const creatorKeypair = await createKeypair(provider);
    const { metadata: nftMetadata2, mint: nftMint2 } = await mintNft(
      provider,
      nftSymbol,
      creatorKeypair,
      holderKeypair.publicKey,
      collectionMint2
    );
    await verifyCollection(
      provider,
      nftMint2,
      collectionMint2,
      collectionCreatorKeypair
    );

    // Update collection info to use collection info 2
    await provider.connection.confirmTransaction(
      await program.methods
        // @ts-ignore
        .updateCollectionInfo({ v2: { collectionMint: collectionMint2 } })
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
    // @ts-ignore
    expect(bucketState.collectionInfo.v2.collectionMint.toBase58()).to.equal(
      collectionMint2.toBase58()
    );

    // Deposit an NFT of collection mint 2
    holderNftTokenAccount = await getAssociatedTokenAddress(
      nftMint2,
      holderKeypair.publicKey
    );
    solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMint2,
      solventAuthorityAddress,
      true
    );

    // Deposit NFT 2 into Solvent
    await provider.connection.confirmTransaction(
      await program.methods
        .depositNft(false, null)
        .accounts({
          signer: holderKeypair.publicKey,
          dropletMint,
          nftMint: nftMint2,
          nftMetadata: nftMetadata2,
          signerNftTokenAccount: holderNftTokenAccount,
          solventNftTokenAccount,
          destinationDropletTokenAccount: holderDropletTokenAccount.address,
        })
        .signers([holderKeypair])
        .rpc()
    );

    // Ensure user received another 100 droplets for the NFT deposited
    holderDropletTokenAccount = await getAccount(
      provider.connection,
      holderDropletTokenAccount.address
    );
    expect(holderDropletTokenAccount.amount).to.equal(BigInt(200 * 100000000));

    // Create a new collection mint: collection mint 3
    const { mint: collectionMint3 } = await mintNft(
      provider,
      nftSymbol,
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

    // Mint an NFT from collection mint 2
    const { mint: nftMint3 } = await mintNft(
      provider,
      nftSymbol,
      creatorKeypair,
      holderKeypair.publicKey,
      collectionMint3
    );
    await verifyCollection(
      provider,
      nftMint3,
      collectionMint3,
      collectionCreatorKeypair
    );

    // Update collection info to use collection mint 3
    await provider.connection.confirmTransaction(
      await program.methods
        // @ts-ignore
        .updateCollectionInfo({ v2: { collectionMint: collectionMint3 } })
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          dropletMint: dropletMint,
        })
        .signers([SOLVENT_ADMIN])
        .rpc()
    );

    // Redeem an NFT from the bucket
    holderNftTokenAccount = await getAssociatedTokenAddress(
      nftMint1,
      holderKeypair.publicKey
    );
    solventNftTokenAccount = await getAssociatedTokenAddress(
      nftMint1,
      solventAuthorityAddress,
      true
    );
    const solventTreasuryDropletTokenAccount = await getAssociatedTokenAddress(
      dropletMint,
      SOLVENT_CORE_TREASURY,
      true
    );

    // Redeem NFT
    await provider.connection.confirmTransaction(
      await program.methods
        .redeemNft(false)
        .accounts({
          signer: holderKeypair.publicKey,
          distributor: SOLVENT_CORE_TREASURY,
          distributorDropletTokenAccount: solventTreasuryDropletTokenAccount,
          dropletMint,
          nftMint: nftMint1,
          solventNftTokenAccount,
          solventTreasury: SOLVENT_CORE_TREASURY,
          solventTreasuryDropletTokenAccount,
          destinationNftTokenAccount: holderNftTokenAccount,
          signerDropletTokenAccount: holderDropletTokenAccount.address,
        })
        .signers([holderKeypair])
        .rpc()
    );

    // Ensure user lost 102 droplets for the NFT redeemed
    holderDropletTokenAccount = await getAccount(
      provider.connection,
      holderDropletTokenAccount.address
    );
    expect(holderDropletTokenAccount.amount).to.equal(BigInt(98 * 100000000));
  });

  it("fails to update collection info when signer is not Solvent admin", async () => {
    // Create a new collection NFT
    const collectionCreatorKeypair = await createKeypair(provider);
    const { mint: collectionMint } = await mintNft(
      provider,
      "DGOD",
      collectionCreatorKeypair,
      collectionCreatorKeypair.publicKey
    );

    const maliciousActorKeypair = await createKeypair(provider);

    try {
      // Update collection info
      await program.methods
        // @ts-ignore
        .updateCollectionInfo({ v2: collectionMint })
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

  afterEach(() => {
    dropletMint = undefined;
    bucketStateAddress = undefined;
  });
});
