import { describe, it, expect } from 'vitest';
import {
    expenseFormSchema,
    incomeFormSchema,
    loginSchema,
    resetPasswordSchema,
    budgetSchema,
    profileSchema,
    searchFilterSchema,
    validateFormData,
    getFieldError,
    formatZodErrors,
} from '../validations';

describe('Expense Form Validation', () => {
    it('should validate correct expense data', () => {
        const validData = {
            description: 'Groceries',
            amount: 50.00,
            categoryId: 'food',
            date: new Date(),
            profileId: 'person1',
        };

        const result = expenseFormSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should reject negative amounts', () => {
        const invalidData = {
            description: 'Test',
            amount: -10,
            categoryId: 'food',
            date: new Date(),
            profileId: 'person1',
        };

        const result = expenseFormSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.errors[0].message).toContain('positive');
        }
    });

    it('should reject amounts over $1,000,000', () => {
        const invalidData = {
            description: 'Test',
            amount: 1000000,
            categoryId: 'food',
            date: new Date(),
            profileId: 'person1',
        };

        const result = expenseFormSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject future dates', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const invalidData = {
            description: 'Test',
            amount: 50,
            categoryId: 'food',
            date: futureDate,
            profileId: 'person1',
        };

        const result = expenseFormSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.errors[0].message).toContain('future');
        }
    });

    it('should reject empty description', () => {
        const invalidData = {
            description: '',
            amount: 50,
            categoryId: 'food',
            date: new Date(),
            profileId: 'person1',
        };

        const result = expenseFormSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject description over 100 characters', () => {
        const invalidData = {
            description: 'a'.repeat(101),
            amount: 50,
            categoryId: 'food',
            date: new Date(),
            profileId: 'person1',
        };

        const result = expenseFormSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('Income Form Validation', () => {
    it('should validate correct income data', () => {
        const validData = {
            description: 'Salary',
            amount: 5000,
            frequency: 'monthly' as const,
            date: new Date(),
        };

        const result = incomeFormSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should reject invalid frequency', () => {
        const invalidData = {
            description: 'Salary',
            amount: 5000,
            frequency: 'invalid',
            date: new Date(),
        };

        const result = incomeFormSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should accept all valid frequencies', () => {
        const frequencies = ['weekly', 'fortnightly', 'monthly', 'one-time'] as const;

        frequencies.forEach(frequency => {
            const data = {
                description: 'Income',
                amount: 1000,
                frequency,
                date: new Date(),
            };

            const result = incomeFormSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });
});

describe('Login Validation', () => {
    it('should validate correct login credentials', () => {
        const validData = {
            email: 'test@example.com',
            password: 'password123',
        };

        const result = loginSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
        const invalidData = {
            email: 'not-an-email',
            password: 'password123',
        };

        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
        const invalidData = {
            email: 'test@example.com',
            password: '',
        };

        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('Password Reset Validation', () => {
    it('should validate correct email', () => {
        const validData = {
            email: 'test@example.com',
        };

        const result = resetPasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
        const invalidData = {
            email: 'invalid-email',
        };

        const result = resetPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('Budget Validation', () => {
    it('should validate correct budget data', () => {
        const validData = {
            categoryId: 'food',
            amount: 500,
            period: 'monthly' as const,
            profileId: 'person1',
        };

        const result = budgetSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should accept all valid periods', () => {
        const periods = ['monthly', 'weekly', 'yearly'] as const;

        periods.forEach(period => {
            const data = {
                categoryId: 'food',
                amount: 500,
                period,
                profileId: 'person1',
            };

            const result = budgetSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });
});

describe('Profile Validation', () => {
    it('should validate correct profile name', () => {
        const validData = {
            name: 'John Doe',
        };

        const result = profileSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should reject name under 2 characters', () => {
        const invalidData = {
            name: 'J',
        };

        const result = profileSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject name over 50 characters', () => {
        const invalidData = {
            name: 'a'.repeat(51),
        };

        const result = profileSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('Search Filter Validation', () => {
    it('should validate correct filter data', () => {
        const validData = {
            query: 'groceries',
            categoryId: 'food',
            dateFrom: new Date('2024-01-01'),
            dateTo: new Date('2024-12-31'),
            minAmount: 0,
            maxAmount: 1000,
        };

        const result = searchFilterSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should reject dateFrom after dateTo', () => {
        const invalidData = {
            dateFrom: new Date('2024-12-31'),
            dateTo: new Date('2024-01-01'),
        };

        const result = searchFilterSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject minAmount greater than maxAmount', () => {
        const invalidData = {
            minAmount: 1000,
            maxAmount: 100,
        };

        const result = searchFilterSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('Validation Helper Functions', () => {
    it('validateFormData should return success for valid data', () => {
        const validData = {
            email: 'test@example.com',
            password: 'password123',
        };

        const result = validateFormData(loginSchema, validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual(validData);
        }
    });

    it('validateFormData should return errors for invalid data', () => {
        const invalidData = {
            email: 'invalid',
            password: '',
        };

        const result = validateFormData(loginSchema, invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors).toBeDefined();
        }
    });

    it('getFieldError should return error message for field', () => {
        const invalidData = {
            email: 'invalid',
            password: 'test',
        };

        const result = loginSchema.safeParse(invalidData);
        if (!result.success) {
            const emailError = getFieldError(result.error, 'email');
            expect(emailError).toBeDefined();
            expect(emailError).toContain('email');
        }
    });

    it('formatZodErrors should format errors as object', () => {
        const invalidData = {
            email: 'invalid',
            password: '',
        };

        const result = loginSchema.safeParse(invalidData);
        if (!result.success) {
            const formatted = formatZodErrors(result.error);
            expect(formatted).toHaveProperty('email');
            expect(formatted).toHaveProperty('password');
        }
    });
});
