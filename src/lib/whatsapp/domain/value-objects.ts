// WhatsApp domain — value objects.
export class PhoneNumber {
  private constructor(private readonly value: string) {}
  static create(raw: string): PhoneNumber {
    const cleaned = raw.trim();
    if (!/^\+?[0-9]{8,15}$/.test(cleaned)) {
      throw new Error(`invalid_phone_number: ${raw}`);
    }
    return new PhoneNumber(cleaned.startsWith("+") ? cleaned : `+${cleaned}`);
  }
  toString(): string {
    return this.value;
  }
}

export class Money {
  constructor(public readonly amount: number, public readonly currency: "YER" = "YER") {
    if (!Number.isFinite(amount) || amount < 0) throw new Error("invalid_money_amount");
  }
  toString(): string {
    return `${this.amount} ر.ي`;
  }
}

export class StockQuantity {
  constructor(public readonly value: number) {
    if (!Number.isInteger(value) || value < 0) throw new Error("invalid_stock_quantity");
  }
  isAvailable(required = 1): boolean {
    return this.value >= required;
  }
  /** 🟢 >10, 🟡 1–10, 🔴 0 */
  emoji(): "🟢" | "🟡" | "🔴" {
    if (this.value > 10) return "🟢";
    if (this.value > 0) return "🟡";
    return "🔴";
  }
}
