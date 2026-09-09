export class BaseRepository<T> {
  private items: T[] = [];

  create(item: T) {
    this.items.push(item);
    return item;
  }

  findAll() {
    return this.items;
  }
}
