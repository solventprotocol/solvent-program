// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import { web3 } from "@project-serum/anchor";
import { readFileSync } from "fs";
import { resolve } from "path";

const anchor = require("@project-serum/anchor");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Read the generated IDL.
  const idl = JSON.parse(readFileSync("../target/idl/solvent.json", "utf8"));

  // Address of the deployed program.
  const programId = new anchor.web3.PublicKey(
    "SVTy4zMgDPExf1RaJdoCo5HvuyxrxdRsqF1uf2Rcd7J"
  );

  const program = new anchor.Program(idl, programId);

  const SOLVENT_ADMIN: web3.Keypair = web3.Keypair.fromSecretKey(
    Buffer.from(
      JSON.parse(
        readFileSync(
          resolve(__dirname, "../target/deploy", "solvent-admin.json"),
          "utf-8"
        )
      )
    )
  );

  const bucketInfos = [
    {
      collectionName: "Aurory",
      dropletSymbol: "AUR",
      dropletMintOld: new anchor.web3.PublicKey(
        "GUtWHTy9N5Av4LTB5PJPn4ZTfxCB2tGiK7DJpS7y8F8S"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "HYtdDGdMFqBrtyUe5z74bKCtH2WUHZiWRicjNVaHSfkg"
      ),
    },
    {
      collectionName: "Balloonsville",
      dropletSymbol: "BV",
      dropletMintOld: new anchor.web3.PublicKey(
        "AgBQSKgZPJPmsMz8qkHbyZdEU4JrRpoNHYh2kxE5TcD1"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "CT1iZ7MJzm8Riy6MTgVht2PowGetEWrnq1SfmUjKvz8c"
      ),
    },
    {
      collectionName: "Degen Ape Academy",
      dropletSymbol: "DAPE",
      dropletMintOld: new anchor.web3.PublicKey(
        "dapeM1DJj3xf2rC5o3Gcz1Cg3Rdu2ayZae9nGcsRRZT"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "6F5A4ZAtQfhvi3ZxNex9E1UN5TK7VM2enDCYG1sx1AXT"
      ),
    },
    {
      collectionName: "DeGods",
      dropletSymbol: "DGOD",
      dropletMintOld: new anchor.web3.PublicKey(
        "DpcmtJniwGRPqU6A8shdcV812uddwoxDCMfXUz2SkLVJ"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "DCgRa2RR7fCsD63M3NgHnoQedMtwH1jJCwZYXQqk9x3v"
      ),
    },
    {
      collectionName: "Famous Fox Federation",
      dropletSymbol: "FFF",
      dropletMintOld: new anchor.web3.PublicKey(
        "2Kc91qK5tA1df2P9BWrjNrJfdQCbCx95iUY8H27aNuWa"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "BoeDfSFRyaeuaLP97dhxkHnsn7hhhes3w3X8GgQj5obK"
      ),
    },
    {
      collectionName: "Galactic Geckos",
      dropletSymbol: "GGSG",
      dropletMintOld: new anchor.web3.PublicKey(
        "ggsgHDoX6tACq25XhQPUmbza8Fzwp9WdAzTU1voTwDi"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "3GQqCi9cuGhAH4VwkmWD32gFHHJhxujurzkRCQsjxLCT"
      ),
    },
    {
      collectionName: "Genopets Genesis",
      dropletSymbol: "GENO",
      dropletMintOld: new anchor.web3.PublicKey(
        "GknXZXR3Y84wgmDUxtsoR9FBHEZovqXFuDK2jczi1ydz"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "4MSMKZwGnkT8qxK8LsdH28Uu8UfKRT2aNaGTU8TEMuHz"
      ),
    },
    {
      collectionName: "Gooney Toons",
      dropletSymbol: "GOON",
      dropletMintOld: new anchor.web3.PublicKey(
        "goonVPLC3DARhntpoE56nrsybwMnP76St5JoywzCmMw"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "9acdc5M9F9WVM4nVZ2gPtVvkeYiWenmzLW9EsTkKdsUJ"
      ),
    },
    {
      collectionName: "Honey Genesis Bee",
      dropletSymbol: "HNYG",
      dropletMintOld: new anchor.web3.PublicKey(
        "GuRdDYCNuykG28e77aFVD7gvwdeRqziBfQYdCdRqSVVS"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "DXA9itWDGmGgqqUoHnBhw6CjvJKMUmTMKB17hBuoYkfQ"
      ),
    },
    {
      collectionName: "Lifinity Flares",
      dropletSymbol: "LIFL",
      dropletMintOld: new anchor.web3.PublicKey(
        "5aGsu5hASnsnQVXV58fN8Jw9P8BVyfDnH2eYatmFLGoQ"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "4wGimtLPQhbRT1cmKFJ7P7jDTgBqDnRBWsFXEhLoUep2"
      ),
    },
    {
      collectionName: "Pesky Penguins",
      dropletSymbol: "PSK",
      dropletMintOld: new anchor.web3.PublicKey(
        "pskJRUNzJbVu4RaZSUJYfvaTNXmFdRCutegL6P2Y9tG"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "Bp6k6xacSc4KJ5Bmk9D5xfbw8nN42ZHtPAswEPkNze6U"
      ),
    },
    {
      collectionName: "Playground Epoch",
      dropletSymbol: "EPOCH",
      dropletMintOld: new anchor.web3.PublicKey(
        "epchejN2prm44RwMfWetBkbMr4wnEXHmMN9nmKyx2TQ"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "3b9wtU4VP6qSUDL6NidwXxK6pMvYLFUTBR1QHWCtYKTS"
      ),
    },
    {
      collectionName: "Playground Waves",
      dropletSymbol: "PLWAV",
      dropletMintOld: new anchor.web3.PublicKey(
        "FQkm6bACFuJpGDmnkvYoq2Luhcc65oam2dg1tXfnKWAY"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "8vkTew1mT8w5NapTqpAoNUNHW2MSnAGVNeu8QPmumSJM"
      ),
    },
    {
      collectionName: "Solana Monkey Business",
      dropletSymbol: "PLWAV",
      dropletMintOld: new anchor.web3.PublicKey(
        "smbdJcLBrtKPhjrWCpDv5ABdJwz2vYo3mm6ojmePL3t"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "Ca5eaXbfQQ6gjZ5zPVfybtDpqWndNdACtKVtxxNHsgcz"
      ),
    },
    {
      collectionName: "Catalina Whale Mixer",
      dropletSymbol: "CWM",
      dropletMintOld: new anchor.web3.PublicKey(
        "cwmkTPCxDkYpBjLQRNhcCKxuxnAQW6ahS7JQLeXrsXt"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "8W2ZFYag9zTdnVpiyR4sqDXszQfx2jAZoMcvPtCSQc7D"
      ),
    },
    {
      collectionName: "Thugbirdz",
      dropletSymbol: "THUGZ",
      dropletMintOld: new anchor.web3.PublicKey(
        "FFBnqafsjrvvxxf5n3Tzba8V7vWPb8wr5DPEog1VAwff"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "EmLJ8cNEsUtboiV2eiD6VgaEscSJ6zu3ELhqixUP4J56"
      ),
    },
    {
      collectionName: "Visionary Studios",
      dropletSymbol: "VSNRY",
      dropletMintOld: new anchor.web3.PublicKey(
        "8k8nYi4NSigPgk9CijcDJyoraGr273AggWZFgn8Adk1a"
      ),
      dropletMintNew: new anchor.web3.PublicKey(
        "EiasWmzy9MrkyekABHLfFRkGhRakaWNvmQ8h5DV86zyn"
      ),
    },
  ];

  for (const bucketInfo of bucketInfos) {
    const dropletMintOld = bucketInfo.dropletMintOld;
    const dropletMintNew = bucketInfo.dropletMintNew;

    console.log("Enabling migration");
    console.log("dropletMintOld: ", dropletMintOld.toString());
    console.log("dropletMintNew: ", dropletMintNew.toString());

    let res = await program.methods
      .startMigration()
      .accounts({
        signer: SOLVENT_ADMIN.publicKey,
        dropletMintOld,
        dropletMintNew,
      })
      .signers([SOLVENT_ADMIN])
      .rpc();
  }
};
