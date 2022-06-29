import * as anchor from "@project-serum/anchor";
import { createKeypair, getMerkleTree, mintNft } from "../../utils";
import {
  SOLVENT_AUTHORITY_SEED,
  SOLVENT_ADMIN,
  SOLVENT_V1_PROGRAM_ID,
  NftInfo,
  program,
  provider,
  SOLVENT_TREASURY,
  smbMints,
} from "../common";
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintToChecked,
} from "@solana/spl-token-latest";
import { Solvent } from "../../types/solvent";
import * as solventIdl from "../../idls/solvent.json";
import { expect } from "chai";

describe("Migrating droplets from Solvent v1 to v2", () => {
  const nftSymbol = "DAPE";

  const solventV1 = new anchor.Program(
    // @ts-ignore
    solventIdl,
    SOLVENT_V1_PROGRAM_ID,
    provider
  ) as anchor.Program<Solvent>;

  let solventAuthorityAddressOld: anchor.web3.PublicKey,
    solventAuthorityBumpOld: number;

  const { root: whitelistRoot } = getMerkleTree(smbMints);

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        SOLVENT_ADMIN.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Generate a PDA of the Solvent program which holds authority over the bucket
    [solventAuthorityAddressOld, solventAuthorityBumpOld] =
      await anchor.web3.PublicKey.findProgramAddress(
        [SOLVENT_AUTHORITY_SEED],
        solventV1.programId
      );
  });

  let dropletMintOld: anchor.web3.PublicKey,
    dropletMintNew: anchor.web3.PublicKey;
  const nftInfos: NftInfo[] = [];

  beforeEach(async () => {
    // Addresses of verified creators of the NFT collection
    const creatorAddresses: anchor.web3.PublicKey[] = [];

    // Minting 3 NFTs and sending them to 3 different users
    for (const i of Array(3)) {
      // Generate NFT creator and holder keypairs
      const holderKeypair = await createKeypair(provider);
      const creatorKeypair = await createKeypair(provider);

      // Creator mints an NFT and sends it to holder
      const { mint, metadata } = await mintNft(
        provider,
        nftSymbol,
        creatorKeypair,
        holderKeypair.publicKey
      );

      // Set public vars' values
      nftInfos.push({
        nftMintAddress: mint,
        nftMetadataAddress: metadata,
        holderKeypair,
      });
      creatorAddresses.push(creatorKeypair.publicKey);
    }

    // Create bucket on Solvent V1
    const dropletMintKeypairOld = new anchor.web3.Keypair();
    dropletMintOld = dropletMintKeypairOld.publicKey;
    const [bucketStateAddressOld, bucketStateBumpOld] =
      await anchor.web3.PublicKey.findProgramAddress(
        [dropletMintOld.toBuffer(), Buffer.from("bucket-seed-v2")],
        solventV1.programId
      );

    const tx = new anchor.web3.Transaction();
    tx.add(
      await solventV1.methods
        .newBucketV2(solventAuthorityBumpOld, bucketStateBumpOld, nftSymbol)
        .accounts({
          bucketCreator: provider.wallet.publicKey,
          bucketMint: dropletMintOld,
          bucketStateV2: bucketStateAddressOld,
          solventAuthority: solventAuthorityAddressOld,
        })
        .signers([dropletMintKeypairOld])
        .remainingAccounts(
          creatorAddresses.map((value) => {
            return {
              pubkey: value,
              isSigner: false,
              isWritable: true,
            };
          })
        )
        .instruction()
    );

    try {
      await provider.sendAndConfirm(tx, [dropletMintKeypairOld]);
    } catch (error) {
      console.log(error);
      throw error;
    }

    // Deposit all NFTs into the old Solvent's bucket
    for (const {
      nftMintAddress,
      nftMetadataAddress,
      holderKeypair,
    } of nftInfos) {
      // NFT holder's NFT account
      const holderNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftMintAddress,
        holderKeypair.publicKey
      );

      // Bucket's NFT account, a PDA owned by the Solvent program
      const solventNftTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        nftMintAddress,
        solventAuthorityAddressOld,
        true
      );

      // The holder's droplet account
      let holderDropletTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        holderKeypair,
        dropletMintOld,
        holderKeypair.publicKey
      );

      const solventTreasuryDropletAccount =
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          holderKeypair,
          dropletMintOld,
          SOLVENT_TREASURY
        );

      // Deposit NFT into Solvent
      await provider.connection.confirmTransaction(
        await solventV1.methods
          .mintDropletV2(solventAuthorityBumpOld)
          .accounts({
            signerWallet: holderKeypair.publicKey,
            solventAuthority: solventAuthorityAddressOld,
            bucketMint: dropletMintOld,
            bucketStateV2: bucketStateAddressOld,
            nftMint: nftMintAddress,
            metadata: nftMetadataAddress,
            signerTokenAc: holderNftTokenAccount.address,
            solventTokenAc: solventNftTokenAccount.address,
            solventMintFeeAc: solventTreasuryDropletAccount.address,
            destinationDropletAc: holderDropletTokenAccount.address,
          })
          .signers([holderKeypair])
          .rpc()
      );
    }

    // Create bucket on Solvent V2
    const bucketCreatorKeypair = await createKeypair(provider);
    const dropletMintKeypairNew = new anchor.web3.Keypair();
    dropletMintNew = dropletMintKeypairNew.publicKey;

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
          dropletMint: dropletMintNew,
        })
        .signers([dropletMintKeypairNew, bucketCreatorKeypair])
        .rpc()
    );

    // Start migration
    await provider.connection.confirmTransaction(
      await program.methods
        .startMigration()
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          dropletMintOld,
          dropletMintNew,
        })
        .signers([SOLVENT_ADMIN])
        .rpc()
    );
  });

  it("can migrate droplets", async () => {
    // Deposit all NFTs into the old Solvent's bucket
    for (const [index, { holderKeypair }] of nftInfos.entries()) {
      // The holder's droplet accounts
      const holderDropletTokenAccountOld =
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          holderKeypair,
          dropletMintOld,
          holderKeypair.publicKey
        );

      const holderDropletTokenAccountNew =
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          holderKeypair,
          dropletMintNew,
          holderKeypair.publicKey
        );

      const adminDropletAccount = await getAssociatedTokenAddress(
        dropletMintOld,
        SOLVENT_ADMIN.publicKey,
        true
      );

      // Migrate droplets
      await provider.connection.confirmTransaction(
        await program.methods
          .migrateDroplets()
          .accounts({
            signer: holderKeypair.publicKey,
            solventAdmin: SOLVENT_ADMIN.publicKey,
            dropletMintOld,
            dropletMintNew,
            signerDropletAccountOld: holderDropletTokenAccountOld.address,
            signerDropletAccountNew: holderDropletTokenAccountNew.address,
            adminDropletAccount,
          })
          .signers([holderKeypair])
          .rpc()
      );

      // Assert Solvent received the droplets
      expect(
        (await getAccount(provider.connection, adminDropletAccount)).amount
      ).to.equal(10000000000n * BigInt(index + 1));

      // Assert user lost v1 droplets
      expect(
        (
          await getAccount(
            provider.connection,
            holderDropletTokenAccountOld.address
          )
        ).amount
      ).to.equal(0n);

      // Assert user received new droplets
      expect(
        (
          await getAccount(
            provider.connection,
            holderDropletTokenAccountNew.address
          )
        ).amount
      ).to.equal(10000000000n);
    }
  });

  it("fails to migrate droplets when given invalid old droplets", async () => {
    const maliciousActorKeypair = await createKeypair(provider);

    const invalidDropletMint = await createMint(
      provider.connection,
      maliciousActorKeypair,
      maliciousActorKeypair.publicKey,
      null,
      8
    );

    const maliciousActorDropletTokenAccountOld =
      await createAssociatedTokenAccount(
        provider.connection,
        maliciousActorKeypair,
        invalidDropletMint,
        maliciousActorKeypair.publicKey
      );

    await mintToChecked(
      provider.connection,
      maliciousActorKeypair,
      invalidDropletMint,
      maliciousActorDropletTokenAccountOld,
      maliciousActorKeypair.publicKey,
      100,
      8
    );

    const maliciousActorDropletTokenAccountNew =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        maliciousActorKeypair,
        dropletMintNew,
        maliciousActorKeypair.publicKey
      );

    const adminDropletAccount = await getAssociatedTokenAddress(
      invalidDropletMint,
      SOLVENT_ADMIN.publicKey,
      true
    );

    // Migrate droplets
    try {
      await provider.connection.confirmTransaction(
        await program.methods
          .migrateDroplets()
          .accounts({
            signer: maliciousActorKeypair.publicKey,
            solventAdmin: SOLVENT_ADMIN.publicKey,
            dropletMintOld: invalidDropletMint,
            dropletMintNew,
            signerDropletAccountOld: maliciousActorDropletTokenAccountOld,
            signerDropletAccountNew:
              maliciousActorDropletTokenAccountNew.address,
            adminDropletAccount: adminDropletAccount,
          })
          .signers([maliciousActorKeypair])
          .rpc()
      );
    } catch (error) {
      expect(error.message).contains("A has one constraint was violated.");
      return;
    }
    expect.fail(
      "Program did not fail while migrating droplets with invalid older droplet."
    );
  });

  afterEach(async () => {
    dropletMintOld = undefined;
    dropletMintNew = undefined;
    nftInfos.length = 0;
  });
});
