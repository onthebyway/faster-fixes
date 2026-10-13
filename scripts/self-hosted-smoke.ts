import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

// Run with compose.smoke.yaml against disposable local volumes, never production.
// Creates a test account, Project, Reviewer, avatars/logos, and Feedback.
const origin = "http://localhost:3000";
const mailpit = "http://localhost:8025";
const email = `selfhost-${Date.now()}@example.test`;
const password = randomBytes(18).toString("hex");
const cookies = new Map<string, string>();
const checkpoint = "/tmp/fasterfixes-self-hosted-smoke.json";
const publicImages: string[] = [];
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lT8AAAAASUVORK5CYII=",
  "base64",
);

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(new URL(path, origin), {
    ...options,
    redirect: "manual",
    headers: {
      origin,
      cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      ...(typeof options.body === "string"
        ? { "content-type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0]!;
    const equals = pair.indexOf("=");
    cookies.set(pair.slice(0, equals), pair.slice(equals + 1));
  }
  return response;
}

async function jsonRequest(path: string, body?: unknown) {
  const response = await request(path, {
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
}

async function mutation(path: string, input?: unknown) {
  const payload = await jsonRequest(`/api/trpc/${path}`, {
    json: input ?? null,
  });
  assert.ok(payload.result, JSON.stringify(payload));
  return payload.result.data.json;
}

type Mail = { ID: string; Subject: string; To: { Address: string }[] };
async function findEmail(subject: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const list: { messages: Mail[] } = await fetch(
      `${mailpit}/api/v1/messages`,
    ).then((response) => response.json());
    const message = list.messages.find(
      (mail) =>
        mail.Subject === subject && mail.To.some((to) => to.Address === email),
    );
    if (message) {
      return fetch(`${mailpit}/api/v1/message/${message.ID}`).then((response) =>
        response.json(),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${subject}`);
}

assert.equal((await jsonRequest("/api/health")).status, "ok");
if (process.argv.includes("--check-persistence")) {
  const state = JSON.parse(readFileSync(checkpoint, "utf8"));
  const login = await jsonRequest("/api/auth/sign-in/email", {
    email: state.email,
    password: state.password,
  });
  assert.equal(login.user.id, state.userId);
  const list = await fetch(`${origin}/api/v1/feedback`, {
    headers: {
      origin,
      "x-api-key": state.projectPublicId,
      "x-reviewer-token": state.reviewerToken,
    },
  }).then((response) => response.json());
  const feedback = list.feedback.find(
    (item: { id: string }) => item.id === state.feedbackId,
  );
  assert.ok(feedback, "Project, Reviewer, and Feedback must survive restart");
  for (const url of [...state.publicImages, feedback.screenshotUrl]) {
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
  }
  console.log(
    "PASS: account, Project, Reviewer, Feedback, avatar, logo, and screenshot survive restart",
  );
  process.exit(0);
}
let synced = false;
for (let attempt = 0; attempt < 60; attempt++) {
  const registry = await fetch("http://localhost:8288/v0/gql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: "{ apps { name error functions { name } } }",
    }),
  }).then((response) => response.json());
  synced = registry.data.apps.some(
    (app: {
      name: string;
      error: string | null;
      functions: { name: string }[];
    }) =>
      app.name === "faster-fixes" &&
      app.error === null &&
      app.functions.some((fn) => fn.name === "send-welcome-email"),
  );
  if (synced) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
assert.ok(synced, "Inngest must sync the app before events are emitted");
const script = await request("/widget.iife.js");
assert.equal(script.status, 200);
assert.match(script.headers.get("content-type") ?? "", /javascript/);
assert.ok((await script.text()).length > 1000);
console.log("PASS: readiness and first-party widget script");

await jsonRequest("/api/auth/sign-up/email", {
  email,
  password,
  name: "Self-hosted smoke test",
  callbackURL: `${origin}/onboarding`,
});
const verification = await findEmail("Verify your email");
const verificationURL = String(verification.HTML)
  .match(/href="(http:\/\/localhost:3000\/api\/auth\/verify-email[^\"]+)"/)?.[1]
  ?.replaceAll("&amp;", "&");
assert.ok(verificationURL, "Email must use the local verification endpoint");
assert.equal((await request(verificationURL)).status, 302);
const session = await jsonRequest("/api/auth/get-session");
assert.equal(session.user.emailVerified, true);
assert.equal(session.user.email, email);
const organizationId = session.session.activeOrganizationId;
assert.ok(organizationId, "Signup creates a default Organization");
await findEmail("Welcome to Faster Fixes");
await jsonRequest("/api/auth/sign-in/email", { email, password });
console.log(
  "PASS: signup, SMTP verification, login, and signed Inngest welcome workflow",
);

const project = await mutation("authenticated.createProject", {
  name: "Self-hosted smoke project",
  domain: "example.test",
});
const reviewer = await mutation("authenticated.projects.reviewer.create", {
  projectId: project.id,
  name: "Self-hosted reviewer",
});
await mutation("onboarding.complete");
console.log(
  "PASS: Organization, Project, Reviewer, and onboarding without Stripe",
);

for (const route of ["user-avatar", "organization-logo"] as const) {
  const upload = await jsonRequest("/api/upload", {
    route,
    files: [{ name: "image.png", size: image.length, type: "image/png" }],
    ...(route === "organization-logo" ? { metadata: { organizationId } } : {}),
  });
  const url = new URL(upload.files[0].signedUrl);
  assert.equal(url.origin, origin);
  assert.equal(
    (
      await fetch(url, {
        method: "PUT",
        headers: { "content-type": "image/png" },
        body: image,
      })
    ).status,
    204,
  );
  const key = upload.files[0].file.objectInfo.key;
  if (route === "user-avatar") {
    await jsonRequest("/api/auth/update-user", { image: key });
  } else {
    await jsonRequest("/api/auth/organization/update", {
      organizationId,
      data: { logo: key },
    });
  }
  url.search = "";
  publicImages.push(url.href);
  const downloaded = await fetch(url);
  assert.equal(downloaded.status, 200);
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), image);
}
console.log(
  "PASS: authorized local avatar and Organization logo uploads and reads",
);

const headers = {
  origin,
  "x-api-key": project.publicId,
  "x-reviewer-token": reviewer.token,
};
const body = new FormData();
body.set(
  "data",
  JSON.stringify({
    comment: "Fully self-hosted screenshot smoke test",
    pageUrl: `${origin}/smoke`,
  }),
);
body.set(
  "screenshot",
  new Blob([image], { type: "image/png" }),
  "screenshot.png",
);
const created = await fetch(`${origin}/api/v1/feedback`, {
  method: "POST",
  headers,
  body,
});
assert.equal(created.status, 201, await created.text());
const feedback = await fetch(`${origin}/api/v1/feedback`, { headers }).then(
  (response) => response.json(),
);
const screenshotURL = new URL(feedback.feedback[0].screenshotUrl);
assert.equal(screenshotURL.origin, origin);
const screenshot = await fetch(screenshotURL);
assert.equal(screenshot.status, 200);
assert.deepEqual(Buffer.from(await screenshot.arrayBuffer()), image);
screenshotURL.search = "";
assert.equal((await fetch(screenshotURL)).status, 403);
console.log(
  "PASS: widget Feedback, persisted screenshot, signed read, and unsigned-read denial",
);
writeFileSync(
  checkpoint,
  JSON.stringify({
    email,
    password,
    userId: session.user.id,
    projectPublicId: project.publicId,
    reviewerToken: reviewer.token,
    feedbackId: feedback.feedback[0].id,
    publicImages,
  }),
  { mode: 0o600 },
);
console.log("All self-hosted HTTP smoke tests passed.");
