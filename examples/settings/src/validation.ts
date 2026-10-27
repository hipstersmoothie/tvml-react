// Validators return an error message, or null when the value is acceptable.

export type Validator = (value: string) => string | null;

export const validateName: Validator = (value) => {
  const name = value.trim();
  if (!name) return "Enter the name you'd like us to use.";
  if (name.length < 2) return "That's a little short. Use at least 2 characters.";
  if (name.length > 30) return "Keep it under 30 characters.";
  return null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateEmail: Validator = (value) => {
  const email = value.trim();
  if (!email) return "Enter an email address.";
  if (!email.includes("@")) return "An email address needs an @.";
  if (!EMAIL.test(email)) return "That doesn't look like a complete email address.";
  return null;
};

export const validatePin: Validator = (value) => {
  if (!/^\d*$/.test(value)) return "Use digits only.";
  if (value.length !== 4) return `Enter 4 digits (${value.length}/4).`;
  if (/^(\d)\1{3}$/.test(value) || value === "1234") return "Pick something harder to guess.";
  return null;
};
