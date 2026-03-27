"use server";
import { SignupFormSchema, FormState } from "../../lib/definitions";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export type SignupErrors = {
  firstName?: string[];
  lastName?: string[];
  email?: string[];
  password?: string[];
  form?: string[];
};

export async function signup(state: FormState, formData: FormData) {
  const formValues = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const validatedFields = SignupFormSchema.safeParse(formValues);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as SignupErrors,
      values: formValues,
    };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: validatedFields.data.email },
    });
    if (existing) {
      return {
        errors: { form: ["An account with this email already exists"] } as SignupErrors,
        values: formValues,
      };
    }

    const hashedPassword = await bcrypt.hash(validatedFields.data.password, 12);
    await prisma.user.create({
      data: {
        email: validatedFields.data.email,
        firstName: validatedFields.data.firstName,
        lastName: validatedFields.data.lastName,
        password: hashedPassword,
        role: "CUSTOMER",
      },
    });

    return { success: true };
  } catch {
    return {
      errors: { form: ["Registration failed. Please try again."] } as SignupErrors,
      values: formValues,
    };
  }
}
