"use server";
import { SignupFormSchema, FormState } from "../../lib/definitions";

export type SignupErrors = {
  firstName?: string[];
  lastName?: string[];
  email?: string[];
  password?: string[];
  file?: string[];
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

  // --- Optional file upload ---
  let avatarKey: string | undefined;
  const file = formData.get("avatar");

  if (file && typeof file !== "string" && file.size > 0) {
    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const uploadResp = await fetch(new URL("/api/upload", BASE_URL).toString(), {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadResp.ok) {
      const body = await uploadResp.json().catch(() => null);
      return {
        errors: {
          file: [body?.error || "File upload failed"],
        } as SignupErrors,
        values: formValues,
      };
    }

    const uploadData = await uploadResp.json();
    avatarKey = uploadData.key as string;
  }

  // --- Create user ---
  const resp = await fetch(new URL("/api/user", BASE_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...validatedFields.data,
      ...(avatarKey ? { avatarKey } : {}),
    }),
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
