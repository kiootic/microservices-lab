export function instance() {
  const data = new Map<string, number>();
  return {
    get: async (id: string) => {
      await delay(100 + random.normal() * 50);
      return data.get(id) ?? 0;
    },
    set: async (id: string, value: number) => {
      await delay(100 + random.normal() * 50);
      data.set(id, value);
    },
  };
}
