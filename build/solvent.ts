export type Solvent = {
  version: "0.1.0";
  name: "solvent";
  instructions: [
    {
      name: "createBucket";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "collectionInfo";
          type: {
            defined: "CollectionInfo";
          };
        }
      ];
    },
    {
      name: "depositNft";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "depositState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "deposit-seed";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "nftMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "metadata";
          isMut: false;
          isSigner: false;
        },
        {
          name: "signerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "solventTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "destinationDropletAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "whitelistProof";
          type: {
            option: {
              vec: {
                array: ["u8", 32];
              };
            };
          };
        }
      ];
    },
    {
      name: "redeemNft";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "depositState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "deposit-seed";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "nftMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "solventTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "destinationTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "signerDropletAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "lockNft";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "lockerState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "locker-seed";
              }
            ];
          };
        },
        {
          name: "nftMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "metadata";
          isMut: false;
          isSigner: false;
        },
        {
          name: "signerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "solventTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "dropletMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "destinationDropletAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "duration";
          type: "u64";
        },
        {
          name: "whitelistProof";
          type: {
            option: {
              vec: {
                array: ["u8", 32];
              };
            };
          };
        }
      ];
      returns: {
        defined: "CalculateLoanResult";
      };
    },
    {
      name: "unlockNft";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "lockerState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "locker-seed";
              }
            ];
          };
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "nftMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "solventTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "signerDropletAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "destinationTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "solventTreasury";
          isMut: false;
          isSigner: false;
        },
        {
          name: "solventTreasuryDropletAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "dropletMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "liquidateLocker";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "nftMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "lockerState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "locker-seed";
              }
            ];
          };
        },
        {
          name: "depositState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "deposit-seed";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "solventTreasury";
          isMut: false;
          isSigner: false;
        },
        {
          name: "solventTreasuryDropletAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "signerDropletAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "solventTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "updateLockingParams";
      accounts: [
        {
          name: "signer";
          isMut: false;
          isSigner: true;
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "maxLockerDuration";
          type: {
            option: "u64";
          };
        },
        {
          name: "interestScaler";
          type: {
            option: "u8";
          };
        }
      ];
    },
    {
      name: "updateStakingParams";
      accounts: [
        {
          name: "signer";
          isMut: false;
          isSigner: true;
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemworksFarm";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gembankProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemfarmProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemworksFeeAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "setLockingEnabled";
      accounts: [
        {
          name: "signer";
          isMut: false;
          isSigner: true;
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "flag";
          type: "bool";
        }
      ];
    },
    {
      name: "setStakingEnabled";
      accounts: [
        {
          name: "signer";
          isMut: false;
          isSigner: true;
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "flag";
          type: "bool";
        }
      ];
    },
    {
      name: "stakeNft";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "farmerAuthority";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "farmer-authority-seed";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              }
            ];
          };
        },
        {
          name: "bucketState";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "nftMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "solventTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "farmerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gemworksBank";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gemworksFarm";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gemworksFarmAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_farm";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gemfarm_program";
            };
          };
        },
        {
          name: "gemworksFarmer";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "farmer";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_farm";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "farmer_authority";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gemfarm_program";
            };
          };
        },
        {
          name: "gemworksVault";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "vault";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_bank";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "farmer_authority";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gemworksGemBox";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "gem_box";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_vault";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gemworksGdr";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "gem_deposit_receipt";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_vault";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gemworksVaultAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_vault";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gemworksGemRarity";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "gem_rarity";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_bank";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gembankProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemfarmProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemworksFeeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "unstakeNft";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "solventAuthority";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "farmerAuthority";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "farmer-authority-seed";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              }
            ];
          };
        },
        {
          name: "bucketState";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "nftMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "solventTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "farmerRewardATokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "farmerRewardBTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gemworksBank";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gemworksFarm";
          isMut: true;
          isSigner: false;
        },
        {
          name: "gemworksFarmAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_farm";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gemfarm_program";
            };
          };
        },
        {
          name: "gemworksFarmer";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "farmer";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_farm";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "farmer_authority";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gemfarm_program";
            };
          };
        },
        {
          name: "gemworksRewardAPot";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "reward_pot";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_farm";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "gemworks_reward_a_mint";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gemfarm_program";
            };
          };
        },
        {
          name: "gemworksRewardAMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemworksRewardBPot";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "reward_pot";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_farm";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "gemworks_reward_b_mint";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gemfarm_program";
            };
          };
        },
        {
          name: "gemworksRewardBMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemworksFarmTreasury";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "treasury";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_farm";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gemfarm_program";
            };
          };
        },
        {
          name: "gemworksVault";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "vault";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_bank";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "farmer_authority";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gemworksGemBox";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "gem_box";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_vault";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gemworksGdr";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "gem_deposit_receipt";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_vault";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gemworksVaultAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_vault";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gemworksGemRarity";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "gem_rarity";
              },
              {
                kind: "account";
                type: "publicKey";
                path: "gemworks_bank";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              }
            ];
            programId: {
              kind: "account";
              type: "publicKey";
              path: "gembank_program";
            };
          };
        },
        {
          name: "gembankProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemfarmProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "gemworksFeeAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "startMigration";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "migrationState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint_new";
              },
              {
                kind: "const";
                type: "string";
                value: "migration-seed";
              }
            ];
          };
        },
        {
          name: "dropletMintOld";
          isMut: false;
          isSigner: false;
        },
        {
          name: "dropletMintNew";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "migrateDroplets";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "solventAdmin";
          isMut: false;
          isSigner: false;
        },
        {
          name: "migrationState";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint_new";
              },
              {
                kind: "const";
                type: "string";
                value: "migration-seed";
              }
            ];
          };
        },
        {
          name: "dropletMintOld";
          isMut: false;
          isSigner: false;
        },
        {
          name: "signerDropletAccountOld";
          isMut: true;
          isSigner: false;
        },
        {
          name: "dropletMintNew";
          isMut: true;
          isSigner: false;
        },
        {
          name: "signerDropletAccountNew";
          isMut: true;
          isSigner: false;
        },
        {
          name: "adminDropletAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "migrateNft";
      accounts: [
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "solventAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "authority-seed";
              }
            ];
          };
        },
        {
          name: "bucketState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "bucket-seed-v3";
              }
            ];
          };
        },
        {
          name: "depositState";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "droplet_mint";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Mint";
                path: "nft_mint";
              },
              {
                kind: "const";
                type: "string";
                value: "deposit-seed";
              }
            ];
          };
        },
        {
          name: "dropletMint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "nftMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "metadata";
          isMut: false;
          isSigner: false;
        },
        {
          name: "signerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "solventTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "whitelistProof";
          type: {
            option: {
              vec: {
                array: ["u8", 32];
              };
            };
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "bucketStateV3";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "dropletMint";
            type: "publicKey";
          },
          {
            name: "collectionInfo";
            type: {
              defined: "CollectionInfo";
            };
          },
          {
            name: "isLockingEnabled";
            type: "bool";
          },
          {
            name: "maxLockerDuration";
            type: "u64";
          },
          {
            name: "interestScaler";
            type: "u8";
          },
          {
            name: "numNftsInBucket";
            type: "u16";
          },
          {
            name: "numNftsInLockers";
            type: "u16";
          },
          {
            name: "isStakingEnabled";
            type: "bool";
          },
          {
            name: "stakingParams";
            type: {
              option: {
                defined: "StakingParams";
              };
            };
          }
        ];
      };
    },
    {
      name: "lockerState";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "dropletMint";
            type: "publicKey";
          },
          {
            name: "depositor";
            type: "publicKey";
          },
          {
            name: "nftMint";
            type: "publicKey";
          },
          {
            name: "creationTimestamp";
            type: "u64";
          },
          {
            name: "duration";
            type: "u64";
          },
          {
            name: "principalAmount";
            type: "u64";
          },
          {
            name: "maxInterestPayable";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "depositState";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "dropletMint";
            type: "publicKey";
          },
          {
            name: "nftMint";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "migrationState";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "dropletMintNew";
            type: "publicKey";
          },
          {
            name: "dropletMintOld";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "CalculateLoanResult";
      type: {
        kind: "struct";
        fields: [
          {
            name: "principalAmount";
            type: "u64";
          },
          {
            name: "maxInterestPayable";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "StakingParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "gembankProgram";
            type: "publicKey";
          },
          {
            name: "gemfarmProgram";
            type: "publicKey";
          },
          {
            name: "gemworksFarm";
            type: "publicKey";
          },
          {
            name: "gemworksFeeAccount";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "CollectionInfo";
      type: {
        kind: "enum";
        variants: [
          {
            name: "V1";
            fields: [
              {
                name: "symbol";
                type: "string";
              },
              {
                name: "verified_creators";
                type: {
                  vec: "publicKey";
                };
              },
              {
                name: "whitelist_root";
                type: {
                  array: ["u8", 32];
                };
              }
            ];
          },
          {
            name: "V2";
            fields: [
              {
                name: "collection_mint";
                type: "publicKey";
              }
            ];
          }
        ];
      };
    }
  ];
  events: [
    {
      name: "CreateBucketEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "DepositNftEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "nftMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "signerTokenAccount";
          type: "publicKey";
          index: false;
        },
        {
          name: "destinationDropletAccount";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "LiquidateLockerEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "nftMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "signerDropletAccount";
          type: "publicKey";
          index: false;
        },
        {
          name: "solventTreasury";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "LockNftEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "nftMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "signerTokenAccount";
          type: "publicKey";
          index: false;
        },
        {
          name: "destinationDropletAccount";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "MigrateDropletsEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMintNew";
          type: "publicKey";
          index: false;
        },
        {
          name: "signerDropletAccountOld";
          type: "publicKey";
          index: false;
        },
        {
          name: "signerDropletAccountNew";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "MigrateNftEvent";
      fields: [
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "nftMint";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "RedeemNftEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "nftMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "signerDropletAccount";
          type: "publicKey";
          index: false;
        },
        {
          name: "destinationTokenAccount";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "SetLockingEnabledEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "flag";
          type: "bool";
          index: false;
        }
      ];
    },
    {
      name: "SetStakingEnabledEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "flag";
          type: "bool";
          index: false;
        }
      ];
    },
    {
      name: "StakeNftEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "nftMint";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "StartMigrationEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMintOld";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMintNew";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "UnlockNftEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "nftMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "signerDropletAccount";
          type: "publicKey";
          index: false;
        },
        {
          name: "destinationTokenAccount";
          type: "publicKey";
          index: false;
        },
        {
          name: "solventTreasury";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "UnstakeNftEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "nftMint";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "UpdateLockingParamsEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "maxLockerDuration";
          type: {
            option: "u64";
          };
          index: false;
        },
        {
          name: "interestScaler";
          type: {
            option: "u8";
          };
          index: false;
        }
      ];
    },
    {
      name: "UpdateStakingParamsEvent";
      fields: [
        {
          name: "signer";
          type: "publicKey";
          index: false;
        },
        {
          name: "dropletMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "gembankProgram";
          type: "publicKey";
          index: false;
        },
        {
          name: "gemfarmProgram";
          type: "publicKey";
          index: false;
        },
        {
          name: "gemworksFarm";
          type: "publicKey";
          index: false;
        },
        {
          name: "gemworksFeeAccount";
          type: "publicKey";
          index: false;
        }
      ];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "CollectionSymbolInvalid";
      msg: "The NFT collection symbol you entered is invalid.";
    },
    {
      code: 6001;
      name: "VerifiedCreatorsInvalid";
      msg: "There should be 1 to 5 verified creators.";
    },
    {
      code: 6002;
      name: "CollectionVerificationFailed";
      msg: "Failed to verify if the NFT belongs to the collection.";
    },
    {
      code: 6003;
      name: "LockerDurationInvalid";
      msg: "Locking duration entered by you is too long.";
    },
    {
      code: 6004;
      name: "BucketEmpty";
      msg: "There are no NFTs in the bucket.";
    },
    {
      code: 6005;
      name: "LockerExpired";
      msg: "The locker has expired and it's up for liquidation.";
    },
    {
      code: 6006;
      name: "LockerActive";
      msg: "The locker is still active and not up for liquidation.";
    },
    {
      code: 6007;
      name: "DropletsInsufficient";
      msg: "You have insufficient droplets to unlock NFT.";
    },
    {
      code: 6008;
      name: "InterestScalerInvalid";
      msg: "Interest scaler entered by you is larger than the max value.";
    },
    {
      code: 6009;
      name: "LockersDisabled";
      msg: "Lockers feature is disabled on this collection.";
    },
    {
      code: 6010;
      name: "AdminAccessUnauthorized";
      msg: "You do not have administrator access.";
    },
    {
      code: 6011;
      name: "SolventTreasuryInvalid";
      msg: "The Solvent treasury account entered by you is invalid.";
    },
    {
      code: 6012;
      name: "LockerAccessUnauthorized";
      msg: "The locker is not owned by you.";
    },
    {
      code: 6013;
      name: "FarmingParamsInvalid";
      msg: "If farming is enabled, farming params must have all 5 Pubkeys.";
    },
    {
      code: 6014;
      name: "FarmConfigInvalid";
      msg: "The farm is not suitable for staking.";
    },
    {
      code: 6015;
      name: "StakingDisabled";
      msg: "Auto-staking feature is disabled on this collection.";
    },
    {
      code: 6016;
      name: "StakingCooldownPending";
      msg: "The staked NFT is in cooldown period, please wait and try again.";
    }
  ];
};

export const IDL: Solvent = {
  version: "0.1.0",
  name: "solvent",
  instructions: [
    {
      name: "createBucket",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: true,
          isSigner: true,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "collectionInfo",
          type: {
            defined: "CollectionInfo",
          },
        },
      ],
    },
    {
      name: "depositNft",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "depositState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "deposit-seed",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: false,
          isSigner: false,
        },
        {
          name: "signerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "solventTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "destinationDropletAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "whitelistProof",
          type: {
            option: {
              vec: {
                array: ["u8", 32],
              },
            },
          },
        },
      ],
    },
    {
      name: "redeemNft",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "depositState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "deposit-seed",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "solventTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "destinationTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "signerDropletAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "lockNft",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "lockerState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "locker-seed",
              },
            ],
          },
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "metadata",
          isMut: false,
          isSigner: false,
        },
        {
          name: "signerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "solventTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dropletMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "destinationDropletAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "duration",
          type: "u64",
        },
        {
          name: "whitelistProof",
          type: {
            option: {
              vec: {
                array: ["u8", 32],
              },
            },
          },
        },
      ],
      returns: {
        defined: "CalculateLoanResult",
      },
    },
    {
      name: "unlockNft",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "lockerState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "locker-seed",
              },
            ],
          },
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "solventTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "signerDropletAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "destinationTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "solventTreasury",
          isMut: false,
          isSigner: false,
        },
        {
          name: "solventTreasuryDropletAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dropletMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "liquidateLocker",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "lockerState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "locker-seed",
              },
            ],
          },
        },
        {
          name: "depositState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "deposit-seed",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "solventTreasury",
          isMut: false,
          isSigner: false,
        },
        {
          name: "solventTreasuryDropletAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "signerDropletAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "solventTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "updateLockingParams",
      accounts: [
        {
          name: "signer",
          isMut: false,
          isSigner: true,
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "maxLockerDuration",
          type: {
            option: "u64",
          },
        },
        {
          name: "interestScaler",
          type: {
            option: "u8",
          },
        },
      ],
    },
    {
      name: "updateStakingParams",
      accounts: [
        {
          name: "signer",
          isMut: false,
          isSigner: true,
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemworksFarm",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gembankProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemfarmProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemworksFeeAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "setLockingEnabled",
      accounts: [
        {
          name: "signer",
          isMut: false,
          isSigner: true,
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "flag",
          type: "bool",
        },
      ],
    },
    {
      name: "setStakingEnabled",
      accounts: [
        {
          name: "signer",
          isMut: false,
          isSigner: true,
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "flag",
          type: "bool",
        },
      ],
    },
    {
      name: "stakeNft",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "farmerAuthority",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "farmer-authority-seed",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
            ],
          },
        },
        {
          name: "bucketState",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "solventTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "farmerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gemworksBank",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gemworksFarm",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gemworksFarmAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_farm",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gemfarm_program",
            },
          },
        },
        {
          name: "gemworksFarmer",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "farmer",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_farm",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "farmer_authority",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gemfarm_program",
            },
          },
        },
        {
          name: "gemworksVault",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "vault",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_bank",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "farmer_authority",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gemworksGemBox",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "gem_box",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_vault",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gemworksGdr",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "gem_deposit_receipt",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_vault",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gemworksVaultAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_vault",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gemworksGemRarity",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "gem_rarity",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_bank",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gembankProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemfarmProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemworksFeeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "unstakeNft",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "solventAuthority",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "farmerAuthority",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "farmer-authority-seed",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
            ],
          },
        },
        {
          name: "bucketState",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "solventTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "farmerRewardATokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "farmerRewardBTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gemworksBank",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gemworksFarm",
          isMut: true,
          isSigner: false,
        },
        {
          name: "gemworksFarmAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_farm",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gemfarm_program",
            },
          },
        },
        {
          name: "gemworksFarmer",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "farmer",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_farm",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "farmer_authority",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gemfarm_program",
            },
          },
        },
        {
          name: "gemworksRewardAPot",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "reward_pot",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_farm",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "gemworks_reward_a_mint",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gemfarm_program",
            },
          },
        },
        {
          name: "gemworksRewardAMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemworksRewardBPot",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "reward_pot",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_farm",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "gemworks_reward_b_mint",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gemfarm_program",
            },
          },
        },
        {
          name: "gemworksRewardBMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemworksFarmTreasury",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "treasury",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_farm",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gemfarm_program",
            },
          },
        },
        {
          name: "gemworksVault",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "vault",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_bank",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "farmer_authority",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gemworksGemBox",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "gem_box",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_vault",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gemworksGdr",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "gem_deposit_receipt",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_vault",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gemworksVaultAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_vault",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gemworksGemRarity",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "gem_rarity",
              },
              {
                kind: "account",
                type: "publicKey",
                path: "gemworks_bank",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
            ],
            programId: {
              kind: "account",
              type: "publicKey",
              path: "gembank_program",
            },
          },
        },
        {
          name: "gembankProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemfarmProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "gemworksFeeAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "startMigration",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "migrationState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint_new",
              },
              {
                kind: "const",
                type: "string",
                value: "migration-seed",
              },
            ],
          },
        },
        {
          name: "dropletMintOld",
          isMut: false,
          isSigner: false,
        },
        {
          name: "dropletMintNew",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "migrateDroplets",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "solventAdmin",
          isMut: false,
          isSigner: false,
        },
        {
          name: "migrationState",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint_new",
              },
              {
                kind: "const",
                type: "string",
                value: "migration-seed",
              },
            ],
          },
        },
        {
          name: "dropletMintOld",
          isMut: false,
          isSigner: false,
        },
        {
          name: "signerDropletAccountOld",
          isMut: true,
          isSigner: false,
        },
        {
          name: "dropletMintNew",
          isMut: true,
          isSigner: false,
        },
        {
          name: "signerDropletAccountNew",
          isMut: true,
          isSigner: false,
        },
        {
          name: "adminDropletAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "migrateNft",
      accounts: [
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "solventAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "authority-seed",
              },
            ],
          },
        },
        {
          name: "bucketState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "bucket-seed-v3",
              },
            ],
          },
        },
        {
          name: "depositState",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "droplet_mint",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Mint",
                path: "nft_mint",
              },
              {
                kind: "const",
                type: "string",
                value: "deposit-seed",
              },
            ],
          },
        },
        {
          name: "dropletMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "nftMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: false,
          isSigner: false,
        },
        {
          name: "signerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "solventTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "whitelistProof",
          type: {
            option: {
              vec: {
                array: ["u8", 32],
              },
            },
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: "bucketStateV3",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "dropletMint",
            type: "publicKey",
          },
          {
            name: "collectionInfo",
            type: {
              defined: "CollectionInfo",
            },
          },
          {
            name: "isLockingEnabled",
            type: "bool",
          },
          {
            name: "maxLockerDuration",
            type: "u64",
          },
          {
            name: "interestScaler",
            type: "u8",
          },
          {
            name: "numNftsInBucket",
            type: "u16",
          },
          {
            name: "numNftsInLockers",
            type: "u16",
          },
          {
            name: "isStakingEnabled",
            type: "bool",
          },
          {
            name: "stakingParams",
            type: {
              option: {
                defined: "StakingParams",
              },
            },
          },
        ],
      },
    },
    {
      name: "lockerState",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "dropletMint",
            type: "publicKey",
          },
          {
            name: "depositor",
            type: "publicKey",
          },
          {
            name: "nftMint",
            type: "publicKey",
          },
          {
            name: "creationTimestamp",
            type: "u64",
          },
          {
            name: "duration",
            type: "u64",
          },
          {
            name: "principalAmount",
            type: "u64",
          },
          {
            name: "maxInterestPayable",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "depositState",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "dropletMint",
            type: "publicKey",
          },
          {
            name: "nftMint",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "migrationState",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "dropletMintNew",
            type: "publicKey",
          },
          {
            name: "dropletMintOld",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "CalculateLoanResult",
      type: {
        kind: "struct",
        fields: [
          {
            name: "principalAmount",
            type: "u64",
          },
          {
            name: "maxInterestPayable",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "StakingParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "gembankProgram",
            type: "publicKey",
          },
          {
            name: "gemfarmProgram",
            type: "publicKey",
          },
          {
            name: "gemworksFarm",
            type: "publicKey",
          },
          {
            name: "gemworksFeeAccount",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "CollectionInfo",
      type: {
        kind: "enum",
        variants: [
          {
            name: "V1",
            fields: [
              {
                name: "symbol",
                type: "string",
              },
              {
                name: "verified_creators",
                type: {
                  vec: "publicKey",
                },
              },
              {
                name: "whitelist_root",
                type: {
                  array: ["u8", 32],
                },
              },
            ],
          },
          {
            name: "V2",
            fields: [
              {
                name: "collection_mint",
                type: "publicKey",
              },
            ],
          },
        ],
      },
    },
  ],
  events: [
    {
      name: "CreateBucketEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "DepositNftEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "nftMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "signerTokenAccount",
          type: "publicKey",
          index: false,
        },
        {
          name: "destinationDropletAccount",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "LiquidateLockerEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "nftMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "signerDropletAccount",
          type: "publicKey",
          index: false,
        },
        {
          name: "solventTreasury",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "LockNftEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "nftMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "signerTokenAccount",
          type: "publicKey",
          index: false,
        },
        {
          name: "destinationDropletAccount",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "MigrateDropletsEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMintNew",
          type: "publicKey",
          index: false,
        },
        {
          name: "signerDropletAccountOld",
          type: "publicKey",
          index: false,
        },
        {
          name: "signerDropletAccountNew",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "MigrateNftEvent",
      fields: [
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "nftMint",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "RedeemNftEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "nftMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "signerDropletAccount",
          type: "publicKey",
          index: false,
        },
        {
          name: "destinationTokenAccount",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "SetLockingEnabledEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "flag",
          type: "bool",
          index: false,
        },
      ],
    },
    {
      name: "SetStakingEnabledEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "flag",
          type: "bool",
          index: false,
        },
      ],
    },
    {
      name: "StakeNftEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "nftMint",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "StartMigrationEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMintOld",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMintNew",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "UnlockNftEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "nftMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "signerDropletAccount",
          type: "publicKey",
          index: false,
        },
        {
          name: "destinationTokenAccount",
          type: "publicKey",
          index: false,
        },
        {
          name: "solventTreasury",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "UnstakeNftEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "nftMint",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "UpdateLockingParamsEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "maxLockerDuration",
          type: {
            option: "u64",
          },
          index: false,
        },
        {
          name: "interestScaler",
          type: {
            option: "u8",
          },
          index: false,
        },
      ],
    },
    {
      name: "UpdateStakingParamsEvent",
      fields: [
        {
          name: "signer",
          type: "publicKey",
          index: false,
        },
        {
          name: "dropletMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "gembankProgram",
          type: "publicKey",
          index: false,
        },
        {
          name: "gemfarmProgram",
          type: "publicKey",
          index: false,
        },
        {
          name: "gemworksFarm",
          type: "publicKey",
          index: false,
        },
        {
          name: "gemworksFeeAccount",
          type: "publicKey",
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "CollectionSymbolInvalid",
      msg: "The NFT collection symbol you entered is invalid.",
    },
    {
      code: 6001,
      name: "VerifiedCreatorsInvalid",
      msg: "There should be 1 to 5 verified creators.",
    },
    {
      code: 6002,
      name: "CollectionVerificationFailed",
      msg: "Failed to verify if the NFT belongs to the collection.",
    },
    {
      code: 6003,
      name: "LockerDurationInvalid",
      msg: "Locking duration entered by you is too long.",
    },
    {
      code: 6004,
      name: "BucketEmpty",
      msg: "There are no NFTs in the bucket.",
    },
    {
      code: 6005,
      name: "LockerExpired",
      msg: "The locker has expired and it's up for liquidation.",
    },
    {
      code: 6006,
      name: "LockerActive",
      msg: "The locker is still active and not up for liquidation.",
    },
    {
      code: 6007,
      name: "DropletsInsufficient",
      msg: "You have insufficient droplets to unlock NFT.",
    },
    {
      code: 6008,
      name: "InterestScalerInvalid",
      msg: "Interest scaler entered by you is larger than the max value.",
    },
    {
      code: 6009,
      name: "LockersDisabled",
      msg: "Lockers feature is disabled on this collection.",
    },
    {
      code: 6010,
      name: "AdminAccessUnauthorized",
      msg: "You do not have administrator access.",
    },
    {
      code: 6011,
      name: "SolventTreasuryInvalid",
      msg: "The Solvent treasury account entered by you is invalid.",
    },
    {
      code: 6012,
      name: "LockerAccessUnauthorized",
      msg: "The locker is not owned by you.",
    },
    {
      code: 6013,
      name: "FarmingParamsInvalid",
      msg: "If farming is enabled, farming params must have all 5 Pubkeys.",
    },
    {
      code: 6014,
      name: "FarmConfigInvalid",
      msg: "The farm is not suitable for staking.",
    },
    {
      code: 6015,
      name: "StakingDisabled",
      msg: "Auto-staking feature is disabled on this collection.",
    },
    {
      code: 6016,
      name: "StakingCooldownPending",
      msg: "The staked NFT is in cooldown period, please wait and try again.",
    },
  ],
};
