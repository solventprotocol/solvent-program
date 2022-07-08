import * as anchor from "@project-serum/anchor";
import {
  program,
  provider,
  SOLVENT_ADMIN,
  SOLVENT_AUTHORITY_SEED,
  SOLVENT_CORE_TREASURY as SOLVENT_TREASURY,
} from "../common";
import { expect } from "chai";

describe("Claiming balance of Solvent's PDAs", () => {
  let solventAuthority: anchor.web3.PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        SOLVENT_ADMIN.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    [solventAuthority] = await anchor.web3.PublicKey.findProgramAddress(
      [SOLVENT_AUTHORITY_SEED],
      program.programId
    );

    // Airdrop 10 SOLs to the Solvent authority PDA
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        solventAuthority,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
  });

  it("can claim balance of Solvent's PDAs", async () => {
    const minRentExcemptAmount =
      await provider.connection.getMinimumBalanceForRentExemption(0);

    // Get initial balances
    const initialSolventAuthorityBalance = await provider.connection.getBalance(
      solventAuthority
    );
    const initialSolventTreasuryBalance = await provider.connection.getBalance(
      SOLVENT_TREASURY
    );

    // Claim balance
    await provider.connection.confirmTransaction(
      await program.methods
        .claimBalance()
        .accounts({
          signer: SOLVENT_ADMIN.publicKey,
          solventTreasury: SOLVENT_TREASURY,
          solventAuthority,
        })
        .signers([SOLVENT_ADMIN])
        .rpc()
    );

    // Check the SOL balances got transferred
    expect(await provider.connection.getBalance(solventAuthority)).to.equal(
      minRentExcemptAmount
    );
    expect(
      (await provider.connection.getBalance(SOLVENT_TREASURY)) -
        initialSolventTreasuryBalance
    ).to.equal(initialSolventAuthorityBalance - minRentExcemptAmount);
  });
});
