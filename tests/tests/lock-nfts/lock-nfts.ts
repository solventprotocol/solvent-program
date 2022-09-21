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
  BUCKET_SEED,
  SOLVENT_AUTHORITY_SEED,
  NftInfo,
  LOCKER_SEED,
  SOLVENT_ADMIN,
  smbMints,
} from "../common";

describe("Locking NFTs into lockers", () => {
  const nftSymbol = "DAPE";

  let solventAuthorityAddress: anchor.web3.PublicKey;

  before(async () => {
    // Generate Solvent authority PDA
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
    let dropletMint: anchor.web3.PublicKey;
    let bucketStateAddress: anchor.web3.PublicKey;

    let whitelistRoot: number[], whitelistTree: MerkleTree;

    beforeEach(async () => {
      // Minting 5 NFTs and sending them to 5 different users
      for (const i of Array(5)) {
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

      // Create the bucket address
      const bucketCreatorKeypair = await createKeypair(provider);
      const dropletMintKeypair = new anchor.web3.Keypair();
      dropletMint = dropletMintKeypair.publicKey;
      [bucketStateAddress] = await anchor.web3.PublicKey.findProgramAddress(
        [dropletMintKeypair.publicKey.toBuffer(), BUCKET_SEED],
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
              whitelistRoot: [...whitelistRoot],
            },
          })
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
            dropletMint: dropletMintKeypair.publicKey,
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

        const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

        // Deposit NFT into Solvent
        await provider.connection.confirmTransaction(
          await program.methods
            .depositNft(false, whitelistProof)
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

    it("can lock NFTs into lockers", async () => {
      // Lock remaining 2 NFTs into locker
      for (const [
        index,
        { nftMintAddress, nftMetadataAddress, holderKeypair },
      ] of nftInfos.slice(3).entries()) {
        // Create the locker address
        const [lockerStateAddress] =
          await anchor.web3.PublicKey.findProgramAddress(
            [dropletMint.toBuffer(), nftMintAddress.toBuffer(), LOCKER_SEED],
            program.programId
          );

        // NFT holder's NFT account
        let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          holderKeypair,
          nftMintAddress,
          holderKeypair.publicKey
        );

        // Locker's NFT account, a PDA owned by the Solvent program
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

        // Lock NFT into a locker
        await provider.connection.confirmTransaction(
          await program.methods
            .lockNft(new anchor.BN(10_000), whitelistProof)
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

        // Ensure if the bucketState and lockerState is updated with relevant info
        const bucketState = await program.account.bucketStateV3.fetch(
          bucketStateAddress
        );
        const lockerState = await program.account.lockerState.fetch(
          lockerStateAddress
        );
        expect(bucketState.numNftsInBucket).to.equal(3);
        expect(bucketState.numNftsInLockers).to.equal(index + 1);
        expect(lockerState.dropletMint.toBase58()).to.equal(
          dropletMint.toBase58()
        );
        expect(lockerState.depositor.toBase58()).to.equal(
          holderKeypair.publicKey.toBase58()
        );
        expect(lockerState.nftMint.toBase58()).to.equal(
          nftMintAddress.toBase58()
        );
        expect(lockerState.duration.toNumber()).to.equal(10_000);

        // Ensure that the user received droplets debt are as expected
        holderDropletTokenAccount = await getAccount(
          provider.connection,
          holderDropletTokenAccount.address
        );
        expect(holderDropletTokenAccount.amount > 0).to.be.true;

        // Ensure user does nto have the deposited NFT
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
      }
    });

    it("fails to lock NFT when creator is not a verified creator of the collection", async () => {
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

      // Locker's NFT account, a PDA owned by the Solvent program
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
        await program.methods
          .lockNft(new anchor.BN(10_000), whitelistProof)
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
        "Program did not fail while locking NFT with an unverified creator."
      );
    });

    it("fails to lock NFT when collection symbol doesn't match", async () => {
      // Mint another NFT created with a different symbol but a verified creator
      const holderKeypair = await createKeypair(provider);
      const { mint: nftMintAddress, metadata: nftMetadataAddress } =
        await mintNft(
          provider,
          // The symbol is different from nftSymbol
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

      // Locker's NFT account, a PDA owned by the Solvent program
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
        await program.methods
          .lockNft(new anchor.BN(10_000), whitelistProof)
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
        "Program did not fail while locking NFT with symbol not matching the collection's."
      );
    });

    it("fails to lock NFT when NFT is not in collection whitelist", async () => {
      // Mint another NFT with same symbol and a verified creator
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

      // Locker's NFT account, a PDA owned by the Solvent program
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

      // Creating a new merkle tree which includes this fake NFT, and getting a proof
      const { tree: whitelistTree } = getMerkleTree([
        ...smbMints,
        ...nftInfos.map((x) => x.nftMintAddress),
        nftMintAddress,
      ]);
      const whitelistProof = getMerkleProof(whitelistTree, nftMintAddress);

      try {
        await program.methods
          .lockNft(new anchor.BN(10_000), whitelistProof)
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
        "Program did not fail while locking NFT which is not in collection whitelist"
      );
    });

    afterEach(() => {
      nftInfos.length = 0;
      dropletMint = undefined;
      bucketStateAddress = undefined;
      creatorAddresses.length = 0;
      creatorKeypair = undefined;
    });
  });

  describe("For Metaplex v1.1 collections", () => {
    const nftInfos: NftInfo[] = [];
    let dropletMint: anchor.web3.PublicKey;
    let bucketStateAddress: anchor.web3.PublicKey;
    let creatorKeypair: anchor.web3.Keypair;

    beforeEach(async () => {
      // Create the collection NFT
      const collectionCreatorKeypair = await createKeypair(provider);
      const { mint: collectionMint } = await mintNft(
        provider,
        nftSymbol,
        collectionCreatorKeypair,
        collectionCreatorKeypair.publicKey
      );

      // 5 NFTs are minted from that collection
      for (const i of Array(5)) {
        creatorKeypair = await createKeypair(provider);
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
            dropletMint: dropletMintKeypair.publicKey,
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
    });

    it("can lock NFTs into lockers", async () => {
      // Lock remaining 2 NFTs into locker
      for (const [
        index,
        { nftMintAddress, nftMetadataAddress, holderKeypair },
      ] of nftInfos.slice(3).entries()) {
        // Create the locker address
        const [lockerStateAddress] =
          await anchor.web3.PublicKey.findProgramAddress(
            [dropletMint.toBuffer(), nftMintAddress.toBuffer(), LOCKER_SEED],
            program.programId
          );

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
            .lockNft(new anchor.BN(10_000), null)
            .accounts({
              signer: holderKeypair.publicKey,
              dropletMint,
              nftMint: nftMintAddress,
              nftMetadata: nftMetadataAddress,
              signerNftTokenAccount: holderNftTokenAccount.address,
              solventNftTokenAccount: solventNftTokenAccount,
              destinationDropletTokenAccount: holderDropletTokenAccount.address,
            })
            .signers([holderKeypair])
            .rpc()
        );

        // Ensure if the bucketState and lockerState is updated with relevant info
        const bucketState = await program.account.bucketStateV3.fetch(
          bucketStateAddress
        );
        const lockerState = await program.account.lockerState.fetch(
          lockerStateAddress
        );
        expect(bucketState.numNftsInBucket).to.equal(3);
        expect(bucketState.numNftsInLockers).to.equal(index + 1);
        expect(lockerState.dropletMint.toBase58()).to.equal(
          dropletMint.toBase58()
        );
        expect(lockerState.depositor.toBase58()).to.equal(
          holderKeypair.publicKey.toBase58()
        );
        expect(lockerState.nftMint.toBase58()).to.equal(
          nftMintAddress.toBase58()
        );
        expect(lockerState.duration.toNumber()).to.equal(10_000);

        // Ensure that the user received droplets debt are as expected
        holderDropletTokenAccount = await getAccount(
          provider.connection,
          holderDropletTokenAccount.address
        );
        expect(holderDropletTokenAccount.amount > 0).to.be.true;

        // Ensure user does nto have the deposited NFT
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
      }
    });

    it("fails to lock NFT when the collection field is not verified", async () => {
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

      // Locker's NFT account, a PDA owned by the Solvent program
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
        // Lock NFT into Solvent
        await program.methods
          .lockNft(new anchor.BN(10_000), null)
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

    afterEach(async () => {
      nftInfos.length = 0;
      dropletMint = undefined;
      bucketStateAddress = undefined;
      creatorKeypair = undefined;
    });
  });

  describe("Metaplex version agnostic", () => {
    const nftInfos: NftInfo[] = [];
    let dropletMint: anchor.web3.PublicKey;

    beforeEach(async () => {
      // Create the collection NFT
      const collectionCreatorKeypair = await createKeypair(provider);
      const { mint: collectionMint } = await mintNft(
        provider,
        nftSymbol,
        collectionCreatorKeypair,
        collectionCreatorKeypair.publicKey
      );

      // 3 NFTs are minted from that collection, the last one with high royalty
      for (const i of [...Array(3).keys()]) {
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
            i === 2 ? 9500 : 100
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
            dropletMint: dropletMintKeypair.publicKey,
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
    });

    it("fails to lock NFT when bucket is empty", async () => {
      const { nftMintAddress, nftMetadataAddress, holderKeypair } = nftInfos[0];
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
          .lockNft(new anchor.BN(10_000), null)
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
        assert.include(error.message, "There are no NFTs in the bucket.");
        return;
      }
      expect.fail(
        "Program did not fail while locking NFT while bucket is empty."
      );
    });

    it("fails to lock when duration is greater than max duration", async () => {
      // Deposit 1 NFT so that bucket is not empty
      const {
        nftMintAddress: nftToDepositMint,
        nftMetadataAddress: nftToDepositMetadata,
        holderKeypair,
      } = nftInfos[0];
      const {
        nftMintAddress: nftToLockMint,
        nftMetadataAddress: nftToLockMetadata,
      } = nftInfos[1];

      // NFT holder's NFT account
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftToDepositMint,
        holderKeypair.publicKey
      );

      // Bucket's NFT account, a PDA owned by the Solvent program
      let solventNftTokenAccount = await getAssociatedTokenAddress(
        nftToDepositMint,
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

      // Deposit NFT into Solvent
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(false, null)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftToDepositMint,
            nftMetadata: nftToDepositMetadata,
            signerNftTokenAccount: holderNftTokenAccount.address,
            solventNftTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // NFT holder's NFT account
      holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftToLockMint,
        holderKeypair.publicKey
      );

      // Bucket's NFT account, a PDA owned by the Solvent program
      solventNftTokenAccount = await getAssociatedTokenAddress(
        nftToLockMint,
        solventAuthorityAddress,
        true
      );

      // The holder's droplet account
      holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        dropletMint,
        holderKeypair.publicKey
      );

      try {
        // Lock NFT into a locker
        await program.methods
          .lockNft(new anchor.BN(100), null)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftToLockMint,
            nftMetadata: nftToLockMetadata,
            signerNftTokenAccount: holderNftTokenAccount.address,
            solventNftTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "Locking duration entered by you is too long."
        );
        return;
      }
      expect.fail(
        "Program did not fail while locking NFT with too long duration"
      );
    });

    it("fails to lock stolen NFT", async () => {
      // Deposit 1 NFT so that bucket is not empty
      const {
        nftMintAddress: nftToDepositMint,
        nftMetadataAddress: nftToDepositMetadata,
        holderKeypair,
      } = nftInfos[0];
      const {
        nftMintAddress: nftToLockMint,
        nftMetadataAddress: nftToLockMetadata,
      } = nftInfos.at(-1);

      // NFT holder's NFT account
      let holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftToDepositMint,
        holderKeypair.publicKey
      );

      // Bucket's NFT account, a PDA owned by the Solvent program
      let solventNftTokenAccount = await getAssociatedTokenAddress(
        nftToDepositMint,
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

      // Deposit NFT into Solvent
      await provider.connection.confirmTransaction(
        await program.methods
          .depositNft(false, null)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftToDepositMint,
            nftMetadata: nftToDepositMetadata,
            signerNftTokenAccount: holderNftTokenAccount.address,
            solventNftTokenAccount,
            destinationDropletTokenAccount: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // NFT holder's NFT account
      holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftToLockMint,
        holderKeypair.publicKey
      );

      // Bucket's NFT account, a PDA owned by the Solvent program
      solventNftTokenAccount = await getAssociatedTokenAddress(
        nftToLockMint,
        solventAuthorityAddress,
        true
      );

      // The holder's droplet account
      holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        dropletMint,
        holderKeypair.publicKey
      );

      try {
        // Lock NFT into a locker
        await program.methods
          .lockNft(new anchor.BN(100), null)
          .accounts({
            signer: holderKeypair.publicKey,
            dropletMint,
            nftMint: nftToLockMint,
            nftMetadata: nftToLockMetadata,
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
      expect.fail(
        "Program did not fail while locking NFT with too long duration"
      );
    });

    afterEach(() => {
      dropletMint = undefined;
      nftInfos.length = 0;
    });
  });
});
