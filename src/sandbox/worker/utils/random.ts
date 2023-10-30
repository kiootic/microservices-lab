const state = new Uint32Array(8 + 2);
const result = new Float64Array(state.buffer, 8 * 4);

function seed() {
  state.set([
    0x418b0e3d, 0x5e625627, 0x5ebea62d, 0x758b22f5, 0x0bc3aa1d, 0x420557bd,
    0xc71e5432, 0x28a73ef0, 0, 0,
  ]);
}
seed();

// https://en.wikipedia.org/wiki/Xorshift#xoshiro256+
// https://stackoverflow.com/a/38425898
function xoshiro256p() {
  state[8] = state[0] + state[6];
  state[9] = state[1] + state[7] + (state[8] < state[0] ? 1 : 0);

  state[9] = (state[9] & 0xfffff) | (1023 << 20);
  const value = result[0] - 1;

  state[8] = state[2] << 17;
  state[9] = (state[3] << 17) | (state[2] >>> 15);

  state[4] ^= state[0];
  state[5] ^= state[1];

  state[6] ^= state[2];
  state[7] ^= state[3];

  state[2] ^= state[4];
  state[3] ^= state[5];

  state[0] ^= state[6];
  state[1] ^= state[7];

  state[4] ^= state[8];
  state[5] ^= state[9];

  state[8] = (state[6] >>> 19) | (state[7] << 13);
  state[9] = (state[7] >>> 19) | (state[6] << 13);
  state[6] = state[8];
  state[7] = state[9];

  return value;
}

function randomUniform(): number {
  return xoshiro256p();
}

let nextNormal: number | null = null;
function randomNormal(): number {
  if (nextNormal != null) {
    const value = nextNormal;
    nextNormal = null;
    return value;
  }

  const u1 = randomUniform();
  const u2 = randomUniform();
  const r = Math.sqrt(-2 * Math.log(u1));
  const theta = 2 * Math.PI * u2;
  const z0 = r * Math.cos(theta);
  const z1 = r * Math.sin(theta);

  nextNormal = z1;
  return z0;
}

function randomExponential() {
  const x = 1 - randomUniform();
  return -Math.log(x);
}

function randomErlang(k: number) {
  let u = 1;
  for (let i = 0; i < k; i++) {
    const x = 1 - randomUniform();
    u *= x;
  }
  return -Math.log(u);
}

function randomPareto(alpha: number) {
  const x = 1 - randomUniform();
  return Math.pow(x, -1 / alpha);
}

function randomChoice<T>(list: T[]): T | null {
  if (list.length === 0) {
    return null;
  }
  return list[Math.floor(randomUniform() * list.length)];
}

export const random = {
  reset: () => seed(),
  uniform: randomUniform,
  normal: randomNormal,
  exponential: randomExponential,
  erlang: randomErlang,
  pareto: randomPareto,
  choice: randomChoice,
};
