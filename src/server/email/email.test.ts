import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// These tests need no database. The Resend SDK is replaced by a fake so nothing is ever sent.
const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    constructor(public key?: string) {
      if (!key) throw new Error("Missing API key. Pass it to the constructor `new Resend(...)`");
    }
    emails = { send: sendMock };
  },
}));

beforeEach(() => {
  vi.resetModules();
  sendMock.mockReset();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/x");
  vi.stubEnv("AUTH_SECRET", "x".repeat(32));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("e-mail client without an API key (the README promised this is safe)", () => {
  it("importing the module and getting the client does not throw", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const mod = await import("./client");
    expect(mod.getResend()).toBeNull();
  });

  it("send functions skip silently and never throw", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("ALLOW_EMAIL_IN_TESTS", "1");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { sendWelcomeEmail, sendLikeNotificationEmail } = await import("./send");
    await expect(sendWelcomeEmail({ to: "a@example.com", name: "A" })).resolves.toBeUndefined();
    await expect(
      sendLikeNotificationEmail({ to: "a@example.com", recipientName: "A", likerName: "B", postTitle: "T", articleSlug: "t" })
    ).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1); // warns once, not on every send
    expect(warn.mock.calls.flat().join(" ")).not.toContain("a@example.com");
  });
});

describe("e-mail sending with a key", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key_abcdefghijklmnop");
    vi.stubEnv("ALLOW_EMAIL_IN_TESTS", "1");
  });

  it("sends through Resend with the configured sender", async () => {
    sendMock.mockResolvedValue({ data: { id: "1" }, error: null });
    const { sendWelcomeEmail } = await import("./send");
    await sendWelcomeEmail({ to: "reader@example.com", name: "Rae" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: "reader@example.com", subject: "Welcome to Inkwell" });
    expect(String(sendMock.mock.calls[0][0].html)).toContain("Rae");
  });

  it("a rejection returned by Resend or a thrown error is logged without secrets and never thrown", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { sendFollowNotificationEmail } = await import("./send");
    const args = { to: "victim@example.com", recipientName: "V", followerName: "F", followerUsername: "f" };

    sendMock.mockResolvedValueOnce({ data: null, error: { name: "validation_error", message: "bad recipient victim@example.com" } });
    await expect(sendFollowNotificationEmail(args)).resolves.toBeUndefined();
    sendMock.mockRejectedValueOnce(new Error("network down re_test_key_abcdefghijklmnop"));
    await expect(sendFollowNotificationEmail(args)).resolves.toBeUndefined();

    const logged = err.mock.calls.flat().join(" ");
    expect(err).toHaveBeenCalledTimes(2);
    expect(logged).not.toContain("victim@example.com");
    expect(logged).not.toContain("re_test_key");
  });

  it("never sends from automated tests unless explicitly allowed", async () => {
    vi.stubEnv("ALLOW_EMAIL_IN_TESTS", "");
    const { sendWelcomeEmail } = await import("./send");
    await sendWelcomeEmail({ to: "a@example.com", name: "A" });
    expect(sendMock).not.toHaveBeenCalled();
  });
});
