let nextNormal: number | null = null;
function randomNormal(): number {
  if (nextNormal != null) {
    const value = nextNormal;
    nextNormal = null;
    return value;
  }

  const u1 = Math.random();
  const u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1));
  const theta = 2 * Math.PI * u2;
  const z0 = r * Math.cos(theta);
  const z1 = r * Math.sin(theta);

  nextNormal = z1;
  return z0;
}

function randomChoice<T>(list: T[]): T | null {
  if (list.length === 0) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
}

export const random = {
  uniform: () => Math.random(),
  normal: randomNormal,
  choice: randomChoice,
};
