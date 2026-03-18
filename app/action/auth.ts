"use server";
import { SignupFormSchema, FormState } from "../../lib/definitions";

export type SignupErrors = {
  firstName?: string[];
  lastName?: string[];
  email?: string[];
  password?: string[];
  form?: string[];
};
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

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

  const resp = await fetch(new URL("/api/user", BASE_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...validatedFields.data }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    return {
      errors: { form: [body?.error || "Registration failed"] } as SignupErrors,
      values: formValues,
    };
  }

  return { success: true };
}
