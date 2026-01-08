import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../utils';

describe('Utility Functions', () => {
    describe('formatCurrency', () => {
        it('should format positive numbers correctly', () => {
            expect(formatCurrency(1000)).toBe('$1,000.00');
            expect(formatCurrency(50.5)).toBe('$50.50');
            expect(formatCurrency(0.99)).toBe('$0.99');
        });

        it('should format negative numbers correctly', () => {
            expect(formatCurrency(-100)).toBe('-$100.00');
            expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
        });

        it('should handle zero', () => {
            expect(formatCurrency(0)).toBe('$0.00');
        });

        it('should handle large numbers', () => {
            expect(formatCurrency(1000000)).toBe('$1,000,000.00');
            expect(formatCurrency(999999.99)).toBe('$999,999.99');
        });

        it('should round to 2 decimal places', () => {
            expect(formatCurrency(10.999)).toBe('$11.00');
            expect(formatCurrency(10.001)).toBe('$10.00');
        });
    });
});
