import * as anchor from "@project-serum/anchor";
import { resolve } from "path";
import { readFileSync } from "fs";
import { SolventProtocol } from "../../target/types/solvent_protocol";
import * as gemFarmIdl from "../idls/gem_farm.json";
import * as gemBankIdl from "../idls/gem_bank.json";
import { GemBankClient, GemFarmClient } from "@gemworks/gem-farm-ts";
import { default as smbMintStrings } from "../nft-mints/smb.json";

export const BUCKET_SEED = Buffer.from("bucket-seed-v3");
export const SOLVENT_AUTHORITY_SEED = Buffer.from("authority-seed");
export const REVENUE_DISTRIBUTION_PARAMS_SEED = Buffer.from(
  "revenue-distribution-params-seed"
);
export const FARMER_AUTHORITY_SEED = Buffer.from("farmer-authority-seed");
export const LOCKER_SEED = Buffer.from("locker-seed");
export const DEPOSIT_SEED = Buffer.from("deposit-seed");
export const SOLVENT_CORE_TREASURY = new anchor.web3.PublicKey(
  "45nueWN9Qwn5vDBmJGBLEsYvaJG6vrNmNdCyrntXDk2K"
);
export const SOLVENT_LOCKERS_TREASURY = new anchor.web3.PublicKey(
  "HkjFiwUW7qnREVm2PxBg8LUrCvjExrJjyYY51wsZTUK8"
);
// TODO: To remove after migration is done
export const SOLVENT_V1_PROGRAM_ID = new anchor.web3.PublicKey(
  "nft3agWJsaL1nN7pERYDFJUf54BzDZwS3oRbEzjrq6q"
);
export const SOLVENT_ADMIN = anchor.web3.Keypair.fromSecretKey(
  Buffer.from(
    JSON.parse(
      readFileSync(
        resolve(__dirname, "../", "keypairs", "solvent-admin.json"),
        "utf-8"
      )
    )
  )
);

export const provider = anchor.getProvider() as anchor.AnchorProvider;

export const program = anchor.workspace
  .SolventProtocol as anchor.Program<SolventProtocol>;

export const getGemFarm = (
  gemFarmProgramId: anchor.web3.PublicKey,
  gemBankProgramId: anchor.web3.PublicKey
) =>
  new GemFarmClient(
    provider.connection,
    provider.wallet as anchor.Wallet,
    // @ts-ignore
    gemFarmIdl,
    gemFarmProgramId,
    gemBankIdl,
    gemBankProgramId
  );

export const getGemBank = (gemBankProgramId: anchor.web3.PublicKey) =>
  new GemBankClient(
    provider.connection,
    provider.wallet as anchor.Wallet,
    // @ts-ignore
    gemBankIdl,
    gemBankProgramId
  );

export interface NftInfo {
  nftMintAddress: anchor.web3.PublicKey;
  nftMetadataAddress: anchor.web3.PublicKey;
  holderKeypair: anchor.web3.Keypair;
}

export const smbMints = smbMintStrings.map((x) => new anchor.web3.PublicKey(x));

export const LAMPORTS_PER_DROPLET = 100000000n;
