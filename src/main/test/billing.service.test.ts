import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';

describe('Financial Math Precision (4 Decimal Places)', () => {
  it('should accurately calculate gross, discount, and net amounts with 4 decimal places', () => {
    const unitPrice = new Decimal(99.9999).toDecimalPlaces(4);
    const quantity = 2;
    const discountPercent = new Decimal(15.5); // 15.5% discount

    const gross = unitPrice.times(quantity).toDecimalPlaces(4);
    expect(gross.toNumber()).toBe(199.9998);

    const discount = gross.times(discountPercent).dividedBy(100).toDecimalPlaces(4);
    expect(discount.toNumber()).toBe(31);

    const net = Decimal.max(0, gross.minus(discount)).toDecimalPlaces(4);
    expect(net.toNumber()).toBe(168.9998);
  });

  it('should prevent floating-point inaccuracies like 14.999999999999998', () => {
    const price = new Decimal(17.65).toDecimalPlaces(4);
    const discountPercent = new Decimal(15).toDecimalPlaces(4);
    
    const discount = price.times(discountPercent).dividedBy(100).toDecimalPlaces(4);
    const net = price.minus(discount).toDecimalPlaces(4);

    expect(discount.toString()).toBe('2.6475');
    expect(net.toString()).toBe('15.0025');
  });

  it('should handle zero unit prices and zero discounts gracefully', () => {
    const unitPrice = new Decimal(0).toDecimalPlaces(4);
    const discount = new Decimal(0).toDecimalPlaces(4);
    const net = Decimal.max(0, unitPrice.minus(discount)).toDecimalPlaces(4);

    expect(net.toNumber()).toBe(0);
  });

  it('should ensure net amount never drops below zero', () => {
    const unitPrice = new Decimal(50).toDecimalPlaces(4);
    const discount = new Decimal(100).toDecimalPlaces(4); // Discount exceeds price
    const net = Decimal.max(0, unitPrice.minus(discount)).toDecimalPlaces(4);

    expect(net.toNumber()).toBe(0);
  });
});
