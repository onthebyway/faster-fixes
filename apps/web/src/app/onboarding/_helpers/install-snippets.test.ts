import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildReactLayoutSnippet,
  buildScriptEmbedSnippet,
} from "./install-snippets";

vi.mock("@/app/_constants/app", () => ({ APP_URL: "http://localhost:3000" }));

const PROJECT_ID = "proj_abc123";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_IS_CLOUD", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildReactLayoutSnippet", () => {
  it("points a self-hosted React widget at the local API", () => {
    vi.stubEnv("NEXT_PUBLIC_IS_CLOUD", "false");
    vi.stubEnv("NEXT_PUBLIC_FF_API_ORIGIN", "https://feedback.example.test");

    expect(buildReactLayoutSnippet(PROJECT_ID)).toContain(
      `projectId="${PROJECT_ID}" apiOrigin="https://feedback.example.test"`,
    );
  });

  it("wraps the layout in a FeedbackProvider carrying the Project public ID", () => {
    const snippet = buildReactLayoutSnippet(PROJECT_ID);

    expect(snippet).toContain(
      'import { FeedbackProvider } from "@fasterfixes/react";',
    );
    expect(snippet).toContain(`<FeedbackProvider projectId="${PROJECT_ID}">`);
  });
});

describe("buildScriptEmbedSnippet", () => {
  it("falls back to the app origin when the optional API origin is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_IS_CLOUD", "false");
    vi.stubEnv("NEXT_PUBLIC_FF_API_ORIGIN", "");

    expect(buildScriptEmbedSnippet(PROJECT_ID)).toContain(
      'src="http://localhost:3000/widget.iife.js"',
    );
  });

  it("serves the script and API from the self-hosted instance", () => {
    vi.stubEnv("NEXT_PUBLIC_IS_CLOUD", "false");
    vi.stubEnv("NEXT_PUBLIC_FF_API_ORIGIN", "https://feedback.example.test");

    expect(buildScriptEmbedSnippet(PROJECT_ID)).toBe(
      `<script src="https://feedback.example.test/widget.iife.js" data-project-id="${PROJECT_ID}" data-api-origin="https://feedback.example.test" defer></script>`,
    );
  });

  it("renders one script tag on the @1 channel with the Project public ID", () => {
    expect(buildScriptEmbedSnippet(PROJECT_ID)).toBe(
      `<script src="https://cdn.jsdelivr.net/npm/@fasterfixes/widget@1/dist/widget.iife.js" data-project-id="${PROJECT_ID}" defer></script>`,
    );
  });

  it("fits on a single line", () => {
    expect(buildScriptEmbedSnippet(PROJECT_ID)).not.toContain("\n");
  });
});
