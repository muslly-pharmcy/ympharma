import { Money, StockQuantity } from "./value-objects";

export class Product {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly money: Money,
    public readonly stock: StockQuantity,
  ) {}

  static create(props: { id: string; name: string; price: number; stock: number }): Product {
    return new Product(
      props.id,
      props.name,
      new Money(props.price ?? 0, "YER"),
      new StockQuantity(props.stock ?? 0),
    );
  }

  get price(): number {
    return this.money.amount;
  }
  get stockQty(): number {
    return this.stock.value;
  }
  get formattedPrice(): string {
    return this.money.toString();
  }
  get stockEmoji(): string {
    return this.stock.emoji();
  }
  isAvailable(qty = 1): boolean {
    return this.stock.isAvailable(qty);
  }
}
