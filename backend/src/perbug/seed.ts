const BYTES32_HEX = /^0x[0-9a-fA-F]{64}$/;

export function validatePlantSeed(seed: string): `0x${string}` {
  if (!BYTES32_HEX.test(seed)) {
    throw new Error("invalid_seed_format");
  }
  return seed.toLowerCase() as `0x${string}`;
}

