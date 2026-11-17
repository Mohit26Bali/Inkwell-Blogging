// A small blocklist of the most common leaked/guessable passwords. Not exhaustive —
// just enough to catch the obvious cases zod's shape rules can't (e.g. "Password1").
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein123",
  "welcome123",
  "admin1234",
  "iloveyou1",
  "sunshine1",
  "princess1",
  "football1",
  "abc12345",
  "changeme1",
  "trustno1",
]);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong";
  checks: {
    minLength: boolean;
    hasLower: boolean;
    hasUpper: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
};

const LABELS: PasswordStrength["label"][] = ["Very weak", "Weak", "Fair", "Good", "Strong"];

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^a-zA-Z0-9]/.test(password),
  };

  if (!password) {
    return { score: 0, label: LABELS[0], checks };
  }

  let points = 0;
  if (checks.minLength) points += 1;
  if (password.length >= 12) points += 1;
  if (checks.hasLower && checks.hasUpper) points += 1;
  if (checks.hasNumber) points += 1;
  if (checks.hasSymbol) points += 1;

  if (isCommonPassword(password)) points = Math.min(points, 1);

  const score = Math.min(4, points) as PasswordStrength["score"];
  return { score, label: LABELS[score], checks };
}
