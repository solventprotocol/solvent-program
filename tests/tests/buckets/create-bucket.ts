import * as anchor from "@project-serum/anchor";
import { createKeypair, getMerkleTree, mintNft } from "../../utils";
import { program, provider, BUCKET_SEED, smbMints } from "../common";
import { assert, expect } from "chai";
import { beforeEach } from "mocha";

describe("Creating buckets", () => {
  const nftSymbol = "DAPE";

  let userKeypair: anchor.web3.Keypair,
    dropletMintKeypair: anchor.web3.Keypair,
    bucketStateAddress: anchor.web3.PublicKey;

  const { root: whitelistRoot } = getMerkleTree(smbMints);

  beforeEach(async () => {
    // An NFT enthusiast wants to create a bucket for an NFT collection
    userKeypair = await createKeypair(provider);

    // Create the bucket address
    dropletMintKeypair = new anchor.web3.Keypair();

    [bucketStateAddress] = await anchor.web3.PublicKey.findProgramAddress(
      [dropletMintKeypair.publicKey.toBuffer(), BUCKET_SEED],
      program.programId
    );
  });

  describe("For Metaplex v1.0 collections", () => {
    // Addresses of verified creators of the NFT collection
    const creatorAddresses: anchor.web3.PublicKey[] = [...Array(5)].map(
      () => new anchor.web3.Keypair().publicKey
    );

    it("can create a bucket", async () => {
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
            signer: userKeypair.publicKey,
            dropletMint: dropletMintKeypair.publicKey,
          })
          .signers([dropletMintKeypair, userKeypair])
          .rpc()
      );

      // Fetch BucketState account and assert it has correct data
      const bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );
      // @ts-ignore
      assert.equal(bucketState.collectionInfo.v1.symbol, nftSymbol);
      assert(bucketState.dropletMint.equals(dropletMintKeypair.publicKey));
      assert.equal(
        // @ts-ignore
        bucketState.collectionInfo.v1.verifiedCreators.length,
        creatorAddresses.length
      );
      assert.sameMembers(
        // @ts-ignore
        bucketState.collectionInfo.v1.verifiedCreators.map((value) =>
          value.toString()
        ),
        creatorAddresses.map((value) => value.toString())
      );
      expect(bucketState.isLockingEnabled).to.be.false;
    });

    it("fails to create bucket when symbol is too long", async () => {
      try {
        // Create bucket on Solvent
        await program.methods
          // @ts-ignore
          .createBucket({
            v1: {
              verifiedCreators: creatorAddresses,
              symbol:
                "an obvious exploit attempt where user is trying to overflow or something",
              whitelistRoot: [...whitelistRoot],
            },
          })
          .accounts({
            signer: userKeypair.publicKey,
            dropletMint: dropletMintKeypair.publicKey,
          })
          .signers([dropletMintKeypair, userKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "The NFT collection symbol you entered is invalid."
        );
        return;
      }
      expect.fail(
        "Program did not fail while creating bucket with too long collection symbol."
      );
    });

    it("fails to create bucket when verified creators list is too long", async () => {
      try {
        // Create bucket on Solvent
        await program.methods
          // @ts-ignore
          .createBucket({
            v1: {
              verifiedCreators: [...Array(10)].map(
                () => new anchor.web3.Keypair().publicKey
              ),
              symbol: "DAPE",
              whitelistRoot: [...whitelistRoot],
            },
          })
          .accounts({
            signer: userKeypair.publicKey,
            dropletMint: dropletMintKeypair.publicKey,
          })
          .signers([dropletMintKeypair, userKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "There should be 1 to 5 verified creators."
        );
        return;
      }
      expect.fail(
        "Program did not fail while creating bucket with too many verified creators."
      );
    });

    it("fails to create bucket when no verified creator is supplied", async () => {
      try {
        // Create bucket on Solvent
        await program.methods
          // @ts-ignore
          .createBucket({
            v1: {
              verifiedCreators: [],
              symbol: "DAPE",
              whitelistRoot: [...whitelistRoot],
            },
          })
          .accounts({
            signer: userKeypair.publicKey,
            dropletMint: dropletMintKeypair.publicKey,
          })
          .signers([dropletMintKeypair, userKeypair])
          .rpc();
      } catch (error) {
        assert.include(
          error.message,
          "There should be 1 to 5 verified creators."
        );
        return;
      }
      expect.fail(
        "Program did not fail while creating bucket with no verified creator."
      );
    });
  });

  describe("For Metaplex v1.1 collections", () => {
    let collectionMint: anchor.web3.PublicKey;

    beforeEach(async () => {
      // Create the collection NFT
      const collectionCreatorKeypair = await createKeypair(provider);
      const { mint } = await mintNft(
        provider,
        "DAPE",
        collectionCreatorKeypair,
        collectionCreatorKeypair.publicKey
      );
      collectionMint = mint;
    });

    it("can create a bucket", async () => {
      // Create bucket on Solvent
      await provider.connection.confirmTransaction(
        await program.methods
          // @ts-ignore
          .createBucket({ v2: { collectionMint } })
          .accounts({
            signer: userKeypair.publicKey,
            dropletMint: dropletMintKeypair.publicKey,
          })
          .signers([dropletMintKeypair, userKeypair])
          .rpc()
      );

      // Fetch BucketState account and assert it has correct data
      const bucketState = await program.account.bucketStateV3.fetch(
        bucketStateAddress
      );
      assert(
        // @ts-ignore
        bucketState.collectionInfo.v2.collectionMint.equals(collectionMint)
      );
      assert(bucketState.dropletMint.equals(dropletMintKeypair.publicKey));
      expect(bucketState.isLockingEnabled).to.be.false;
    });

    afterEach(() => {
      collectionMint = undefined;
    });
  });

  afterEach(() => {
    userKeypair = undefined;
    dropletMintKeypair = undefined;
    bucketStateAddress = undefined;
  });
});
