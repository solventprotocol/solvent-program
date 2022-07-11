import * as anchor from "@project-serum/anchor";
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token-latest";
import { assert, expect } from "chai";
import MerkleTree from "merkletreejs";
import {
  createKeypair,
  getMerkleProof,
  getMerkleTree,
  mintNft,
  verifyCollection,
} from "../../utils";
import {
  program,
  provider,
  SOLVENT_AUTHORITY_SEED,
  NftInfo,
  BUCKET_SEED,
  smbMints,
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

  describe("For Metaplex v1.0 collections", () => {
    // Addresses of verified creators of the NFT collection
    const creatorAddresses: anchor.web3.PublicKey[] = [];

    // One of the verified creators
    let creatorKeypair: anchor.web3.Keypair;

    const nftInfos: NftInfo[] = [];
    let dropletMint: anchor.web3.PublicKey,
      bucketStateAddress: anchor.web3.PublicKey;

    let whitelistRoot: number[], whitelistTree: MerkleTree;

    beforeEach(async () => {
      const holderKeypair = await createKeypair(provider);

      // Minting 5 NFTs and sending them a single user
      for (const i of Array(5)) {
        // Generate NFT creator keypair
        creatorKeypair = await createKeypair(provider);

        // Creator mints an NFT and sends it to holder
        const { mint, metadata } = await mintNft(
          provider,
          nftSymbol,
          creatorKeypair,
          holderKeypair.publicKey,
          null,
          true
        );

        // Set public vars' values
        nftInfos.push({
          nftMintAddress: mint,
          nftMetadataAddress: metadata,
          holderKeypair,
        });
        creatorAddresses.push(creatorKeypair.publicKey);
      }

      const { root, tree } = getMerkleTree([
        ...smbMints,
        ...nftInfos.map((x) => x.nftMintAddress),
      ]);
      whitelistRoot = root;
      whitelistTree = tree;

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
          .createBucket({
            v1: {
              verifiedCreators: creatorAddresses,
              symbol: nftSymbol,
              whitelistRoot,
            },
          })
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

      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      // Deposit NFT into Solvent
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(whitelistProof)
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
        const holderDropletTokenAccount =
          await getOrCreateAssociatedTokenAccount(
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

        const whitelistProof = getMerkleProof(whitelistTree, nftToDepositMint);

        // Deposit NFT for swap
        await provider.connection.confirmTransaction(
          await program.methods
            .depositNftForSwap(whitelistProof)
            .accounts({
              signer: holderKeypair.publicKey,
              dropletMint,
              nftMint: nftToDepositMint,
              nftMetadata: nftToDepositMetadata,
              signerNftTokenAccount: holderNftToDepositTokenAccount.address,
              solventNftTokenAccount: solventNftToDepositTokenAccount,
              destinationDropletTokenAccount: holderDropletTokenAccount.address,
              solventTreasury: SOLVENT_TREASURY,
              solventTreasuryDropletTokenAccount,
            })
            .signers([holderKeypair])
            .rpc()
        );

        // Redeem NFT for swap
        await provider.connection.confirmTransaction(
          await program.methods
            .redeemNftForSwap()
            .accounts({
              signer: holderKeypair.publicKey,
              dropletMint,
              nftMint: nftToRedeemMint,
              destinationNftTokenAccount: holderNftToRedeemTokenAccount.address,
              solventNftTokenAccount: solventNftToRedeemTokenAccount,
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
          (
            await getAccount(
              provider.connection,
              solventNftToDepositTokenAccount
            )
          ).amount
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
          (
            await getAccount(
              provider.connection,
              solventNftToRedeemTokenAccount
            )
          ).amount
        ).to.equal(0n);

        // Ensure counter stays same in bucket
        expect(
          (await program.account.bucketStateV3.fetch(bucketStateAddress))
            .numNftsInBucket
        ).to.equal(bucketState.numNftsInBucket);
      }
    });

    it("fails to deposit NFT for swap when creator is not a verified creator of the collection", async () => {
      // Mint another NFT with the same symbol but unverified creator
      const holderKeypair = await createKeypair(provider);
      const creatorKeypair = await createKeypair(provider);
      const { mint: nftMintAddress, metadata: nftMetadataAddress } =
        await mintNft(
          provider,
          // The symbol is same as nftSymbol
          nftSymbol,
          creatorKeypair,
          holderKeypair.publicKey,
          null,
          true
        );

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

      const solventTreasuryDropletTokenAccount =
        await getAssociatedTokenAddress(dropletMint, SOLVENT_TREASURY);

      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      try {
        // Deposit NFT into Solvent
        await program.methods
          .depositNftForSwap(whitelistProof)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftMintAddress,
            nftMetadata: nftMetadataAddress,
            signerNftTokenAccount: holderNftTokenAccount.address,
            solventNftTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
          })
          .signers([holderKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "Failed to verify if the NFT belongs to the collection."
        );
        return;
      }
      expect.fail(
        "Program did not fail while depositing NFT with an unverified creator."
      );
    });

    it("fails to deposit NFT for swap when collection symbol doesn't match", async () => {
      // Mint another NFT created with a different symbol but a verified creator
      const holderKeypair = await createKeypair(provider);
      const { mint: nftMintAddress, metadata: nftMetadataAddress } =
        await mintNft(
          provider,
          "PSK",
          creatorKeypair,
          holderKeypair.publicKey,
          null,
          true
        );

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

      const solventTreasuryDropletTokenAccount =
        await getAssociatedTokenAddress(dropletMint, SOLVENT_TREASURY);

      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      try {
        // Deposit NFT into Solvent
        await program.methods
          .depositNftForSwap(whitelistProof)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftMintAddress,
            nftMetadata: nftMetadataAddress,
            signerNftTokenAccount: holderNftTokenAccount.address,
            solventNftTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
          })
          .signers([holderKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "Failed to verify if the NFT belongs to the collection."
        );
        return;
      }
      expect.fail(
        "Program did not fail while depositing NFT with symbol not matching the collection's."
      );
    });

    it("fails to deposit NFT for swap when NFT is not in collection whitelist", async () => {
      // Mint another NFT created with same symbol and a verified creator
      const holderKeypair = await createKeypair(provider);
      const { mint: nftMintAddress, metadata: nftMetadataAddress } =
        await mintNft(
          provider,
          nftSymbol,
          creatorKeypair,
          holderKeypair.publicKey,
          null,
          true
        );

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

      const solventTreasuryDropletTokenAccount =
        await getAssociatedTokenAddress(dropletMint, SOLVENT_TREASURY);

      // Creating a new merkle tree which includes this fake NFT, and getting a proof
      const { tree: whitelistTree } = getMerkleTree([
        ...smbMints,
        ...nftInfos.map((x) => x.nftMintAddress),
        nftMintAddress,
      ]);
      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      try {
        // Deposit NFT into Solvent
        await program.methods
          .depositNftForSwap(whitelistProof)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftMintAddress,
            nftMetadata: nftMetadataAddress,
            signerNftTokenAccount: holderNftTokenAccount.address,
            solventNftTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
          })
          .signers([holderKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "Failed to verify if the NFT belongs to the collection."
        );
        return;
      }
      expect.fail(
        "Program did not fail while depositing NFT which is not in collection whitelist"
      );
    });

    afterEach(() => {
      nftInfos.length = 0;
      creatorAddresses.length = 0;
      creatorKeypair = undefined;
      dropletMint = undefined;
      bucketStateAddress = undefined;
    });
  });

  describe("For Metaplex v1.1 collections", () => {
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

      const holderKeypair = await createKeypair(provider);

      // Minting 5 NFTs and sending them the same user
      for (const i of Array(3)) {
        // Generate NFT creator keypair
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
        const holderDropletTokenAccount =
          await getOrCreateAssociatedTokenAccount(
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
            .depositNftForSwap(null)
            .accounts({
              signer: holderKeypair.publicKey,
              dropletMint,
              nftMint: nftToDepositMint,
              nftMetadata: nftToDepositMetadata,
              signerNftTokenAccount: holderNftToDepositTokenAccount.address,
              solventNftTokenAccount: solventNftToDepositTokenAccount,
              destinationDropletTokenAccount: holderDropletTokenAccount.address,
              solventTreasury: SOLVENT_TREASURY,
              solventTreasuryDropletTokenAccount,
            })
            .signers([holderKeypair])
            .rpc()
        );

        // Redeem NFT for swap
        await provider.connection.confirmTransaction(
          await program.methods
            .redeemNftForSwap()
            .accounts({
              signer: holderKeypair.publicKey,
              dropletMint,
              nftMint: nftToRedeemMint,
              destinationNftTokenAccount: holderNftToRedeemTokenAccount.address,
              solventNftTokenAccount: solventNftToRedeemTokenAccount,
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
          (
            await getAccount(
              provider.connection,
              solventNftToDepositTokenAccount
            )
          ).amount
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
          (
            await getAccount(
              provider.connection,
              solventNftToRedeemTokenAccount
            )
          ).amount
        ).to.equal(0n);

        // Ensure counter stays same in bucket
        expect(
          (await program.account.bucketStateV3.fetch(bucketStateAddress))
            .numNftsInBucket
        ).to.equal(bucketState.numNftsInBucket);
      }
    });

    it("fails to deposit NFT for swap when the collection field is not verified", async () => {
      // Mint another NFT with same symbol and a verified creator
      const holderKeypair = await createKeypair(provider);
      const { mint: nftMintAddress, metadata: nftMetadataAddress } =
        await mintNft(
          provider,
          nftSymbol,
          creatorKeypair,
          holderKeypair.publicKey
        );

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

      const solventTreasuryDropletTokenAccount =
        await getAssociatedTokenAddress(dropletMint, SOLVENT_TREASURY);

      // We're even passing a correct merkle proof
      const { tree: whitelistTree } = getMerkleTree([
        ...smbMints,
        ...nftInfos.map((x) => x.nftMintAddress),
      ]);
      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      try {
        // Deposit NFT into Solvent
        await program.methods
          .depositNftForSwap(whitelistProof)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftMintAddress,
            nftMetadata: nftMetadataAddress,
            signerNftTokenAccount: holderNftTokenAccount.address,
            solventNftTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
            solventTreasury: SOLVENT_TREASURY,
            solventTreasuryDropletTokenAccount,
          })
          .signers([holderKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "Failed to verify if the NFT belongs to the collection."
        );
        return;
      }
      expect.fail(
        "Program did not fail while depositing NFT with collection field not verified."
      );
    });

    afterEach(() => {
      creatorKeypair = undefined;
      nftInfos.length = 0;
      dropletMint = undefined;
      bucketStateAddress = undefined;
    });
  });

  describe("Metaplex version agnostic", () => {
    const nftInfos: NftInfo[] = [];
    let dropletMint: anchor.web3.PublicKey;

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

    it("fails to redeem NFT for swap when signer hasn't deposited one for swap first", async () => {
      const {
        nftMintAddress: nftToDepositMint,
        nftMetadataAddress: nftToDepositMetadata,
        holderKeypair,
      } = nftInfos[1];
      const { nftMintAddress: nftToRedeemMint } = nftInfos[2];

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

      // Deposit NFT but not for swap
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
      try {
        await program.methods
          .redeemNftForSwap()
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftToRedeemMint,
            destinationNftTokenAccount: holderNftToRedeemTokenAccount.address,
            solventNftTokenAccount: solventNftToRedeemTokenAccount,
            signerDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "The program expected this account to be already initialized."
        );
        return;
      }
      expect.fail(
        "Program did not fail while redeeming NFT for swap when user has not deposited one for swap first."
      );
    });

    afterEach(() => {
      nftInfos.length = 0;
      dropletMint = undefined;
    });
  });
});
