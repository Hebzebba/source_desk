import * as z from "zod";

export const SignupFormSchema = z.object({
  firstName: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long" }),
  lastName: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long" }),
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(6, { error: "Be at least 6 characters long" })
    .trim(),
});

export type FormState =
  | {
      errors?: {
        firstName?: string[];
        lastName?: string[];
        email?: string[];
        password?: string[];
        file?: string[];
        form?: string[];
      };
      values?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        password?: string;
      };
      message?: string;
      success?: boolean;
    }
  | undefined;
