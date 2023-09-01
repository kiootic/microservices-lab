export function instance() {
  return {
    increment: async (id: string) => {
      let counter = await services.db.get(id);
      counter++;
      await services.db.set(id, counter);

      return counter;
    },
    decrement: async (id: string) => {
      let counter = await services.db.get(id);
      counter--;
      await services.db.set(id, counter);

      return counter;
    },
  };
}
