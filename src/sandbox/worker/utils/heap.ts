const root = 0;

function parent(i: number) {
  return Math.floor((i - 1) / 2);
}
function left(i: number) {
  return i * 2 + 1;
}
function right(i: number) {
  return i * 2 + 2;
}

export class Heap {
  private readonly key: number[] = [];
  private readonly id: number[] = [];

  push(key: number, id: number) {
    this.key.push(key);
    this.id.push(id);
    this.upheap(this.key.length - 1);
  }

  pop(): number | null {
    if (this.key.length == 0) {
      return null;
    }

    this.swap(0, this.key.length - 1);

    this.key.pop();
    const value = this.id.pop() ?? null;
    if (this.key.length > 1) {
      this.downheap(0);
    }
    return value;
  }

  clear() {
    this.key.length = 0;
    this.id.length = 0;
  }

  private swap(i: number, j: number) {
    const key = this.key[i];
    this.key[i] = this.key[j];
    this.key[j] = key;

    const id = this.id[i];
    this.id[i] = this.id[j];
    this.id[j] = id;
  }

  private upheap(index: number) {
    while (index !== root && this.key[index] < this.key[parent(index)]) {
      this.swap(index, parent(index));
      index = parent(index);
    }
  }

  private downheap(index: number) {
    let min = index;
    do {
      index = min;
      const l = left(index);
      const r = right(index);

      if (l < this.key.length && this.key[l] < this.key[min]) {
        min = l;
      }
      if (r < this.key.length && this.key[r] < this.key[min]) {
        min = r;
      }

      this.swap(min, index);
    } while (min !== index);
  }
}
