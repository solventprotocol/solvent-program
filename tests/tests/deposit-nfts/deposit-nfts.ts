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
} from "../common";

describe("Depositing NFTs into bucket", () => {
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
      // Minting 3 NFTs and sending them to 3 different users
      for (const i of Array(3)) {
        // Generate NFT creator and holder keypairs
        const holderKeypair = await createKeypair(provider);
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
    });

    it("can deposit NFTs into bucket", async () => {
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

        let bucketState = await program.account.bucketStateV3.fetch(
          bucketStateAddress
        );
        const numNftsInBucket = bucketState.numNftsInBucket;

        const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

        // Deposit NFT into Solvent
        await provider.connection.confirmTransaction(
          await program.methods
            .depositNft(false, whitelistProof)
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

        // Ensure user received 100 droplets for the NFT deposited
        holderDropletTokenAccount = await getAccount(
          provider.connection,
          holderDropletTokenAccount.address
        );
        expect(holderDropletTokenAccount.amount).to.equal(
          BigInt(100 * 100000000)
        );

        // Ensure user does not have the deposited NFT
        holderNftTokenAccount = await getAccount(
          provider.connection,
          holderNftTokenAccount.address
        );
        expect(holderNftTokenAccount.amount).to.equal(0n);

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

    it("fails to deposit NFT when creator is not a verified creator of the collection", async () => {
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
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
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
      let holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        dropletMint,
        holderKeypair.publicKey
      );

      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      try {
        // Deposit NFT into Solvent
        await program.methods
          .depositNft(false, whitelistProof)
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

    it("fails to deposit NFT when collection symbol doesn't match", async () => {
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
        dropletMint,
        holderKeypair.publicKey
      );

      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      try {
        // Deposit NFT into Solvent
        await program.methods
          .depositNft(false, whitelistProof)
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

    it("fails to deposit NFT when NFT is not in collection whitelist", async () => {
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
        dropletMint,
        holderKeypair.publicKey
      );

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
          .depositNft(false, whitelistProof)
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

      // Minting 3 NFTs and sending them to 3 different users
      for (const i of Array(3)) {
        // Generate NFT creator and holder keypairs
        const holderKeypair = await createKeypair(provider);
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
    });

    it("can deposit NFTs into bucket", async () => {
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

        let bucketState = await program.account.bucketStateV3.fetch(
          bucketStateAddress
        );
        const numNftsInBucket = bucketState.numNftsInBucket;

        // Deposit NFT into Solvent
        await provider.connection.confirmTransaction(
          await program.methods
            .depositNft(false, null)
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

        // Ensure user received 100 droplets for the NFT deposited
        holderDropletTokenAccount = await getAccount(
          provider.connection,
          holderDropletTokenAccount.address
        );
        expect(holderDropletTokenAccount.amount).to.equal(
          BigInt(100 * 100000000)
        );

        // Ensure user does not have the deposited NFT
        holderNftTokenAccount = await getAccount(
          provider.connection,
          holderNftTokenAccount.address
        );
        expect(holderNftTokenAccount.amount).to.equal(0n);

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

    it("fails to deposit NFT when the collection field is not verified", async () => {
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
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
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
      let holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        dropletMint,
        holderKeypair.publicKey
      );

      // We're even passing a correct merkle proof
      const { tree: whitelistTree } = getMerkleTree([
        ...smbMints,
        ...nftInfos.map((x) => x.nftMintAddress),
      ]);
      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      try {
        // Deposit NFT into Solvent
        await program.methods
          .depositNft(false, whitelistProof)
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
    let dropletMint: anchor.web3.PublicKey;
    let nftInfo: NftInfo;

    beforeEach(async () => {
      // Create the collection NFT
      const collectionCreatorKeypair = await createKeypair(provider);
      const { mint: collectionMint } = await mintNft(
        provider,
        nftSymbol,
        collectionCreatorKeypair,
        collectionCreatorKeypair.publicKey
      );

      // An NFT with high seller fee is minted from that collection
      const creatorKeypair = await createKeypair(provider);
      const holderKeypair = await createKeypair(provider);
      const { metadata: nftMetadataAddress, mint: nftMintAddress } =
        await mintNft(
          provider,
          nftSymbol,
          creatorKeypair,
          holderKeypair.publicKey,
          collectionMint,
          false,
          9500
        );

      // Collection authority verifies that the NFT belongs to the collection
      await verifyCollection(
        provider,
        nftMintAddress,
        collectionMint,
        collectionCreatorKeypair
      );

      // Set public vars' values
      nftInfo = {
        nftMintAddress,
        nftMetadataAddress,
        holderKeypair,
      };

      const bucketCreatorKeypair = await createKeypair(provider);

      const dropletMintKeypair = await createKeypair(provider);
      dropletMint = dropletMintKeypair.publicKey;

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
    });

    it("fails to deposit stolen NFT", async () => {
      const { nftMintAddress, nftMetadataAddress, holderKeypair } = nftInfo;

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

      try {
        // Lock NFT into a locker
        await program.methods
          .depositNft(false, null)
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
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "NFT is banned from Solvent because it's likely stolen."
        );
        return;
      }
      expect.fail("Program did not fail while depositing banned NFT.");
    });

    afterEach(() => {
      dropletMint = undefined;
      nftInfo = undefined;
    });
  });
});
