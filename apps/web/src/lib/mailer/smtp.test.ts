import type { SendMailOptions } from "nodemailer";
import { expect, it, vi } from "vitest";
import { SmtpMailer } from "./smtp";

function createTransport() {
  return {
    sendMail: vi.fn(async (_options: SendMailOptions) => ({
      accepted: ["recipient@example.com"],
      rejected: [] as string[],
      pending: [] as string[],
      messageId: "message-id",
      envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
      response: "250 OK",
      envelopeTime: 0,
      messageTime: 0,
      messageSize: 0,
    })),
  };
}

const options = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Verification",
  body: "<p>Verify your email</p>",
};

it("sends to the real recipient with rendered HTML and decoded attachments", async () => {
  const transport = createTransport();
  const mailer = new SmtpMailer(transport);
  expect(
    await mailer.emails.send({
      ...options,
      attachments: [
        { name: "note.txt", content: "aGVsbG8=", type: "text/plain" },
      ],
    }),
  ).toMatchObject({ success: true });
  expect(transport.sendMail.mock.calls[0]?.[0]).toMatchObject({
    from: options.from,
    to: options.to,
    html: options.body,
    attachments: [
      {
        filename: "note.txt",
        content: Buffer.from("hello"),
        contentType: "text/plain",
      },
    ],
  });
  expect("contacts" in mailer).toBe(false);
});

it("rejects missing bodies and provider-specific templates", async () => {
  const mailer = new SmtpMailer(createTransport());
  await expect(
    mailer.emails.send({ ...options, body: undefined }),
  ).rejects.toThrow("rendered email body");
  await expect(
    mailer.emails.send({ ...options, templateId: "template" }),
  ).rejects.toThrow("provider templates");
});

it("does not report rejected recipients or transport failures as success", async () => {
  const transport = createTransport();
  transport.sendMail.mockResolvedValueOnce({
    accepted: [],
    rejected: [options.to],
    pending: [],
    messageId: "",
    envelope: { from: options.from, to: [options.to] },
    response: "550 rejected",
    envelopeTime: 0,
    messageTime: 0,
    messageSize: 0,
  });
  const mailer = new SmtpMailer(transport);
  await expect(mailer.emails.send(options)).rejects.toThrow("rejected");
  transport.sendMail.mockRejectedValueOnce(new Error("SMTP unavailable"));
  await expect(mailer.emails.send(options)).rejects.toThrow("SMTP unavailable");
});
