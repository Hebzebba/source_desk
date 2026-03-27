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
    .min(8, { error: "Be at least 8 characters long" })
    .regex(/[0-9!@#$%^&*]/, { error: "Must contain at least one number or special character" })
    .trim(),
});

export type FormState =
  | {
      errors?: {
        firstName?: string[];
        lastName?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;
