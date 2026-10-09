import { APP_URL } from "@/app/_constants/app";
import { isCloud } from "@/utils/environment/env";

export const REACT_INSTALL_COMMAND = "npm install @fasterfixes/react";

// The `@1` channel serves every 1.x release, so the snippet never needs editing for a fix.
export const SCRIPT_EMBED_URL =
  "https://cdn.jsdelivr.net/npm/@fasterfixes/widget@1/dist/widget.iife.js";

function getWidgetApiOrigin() {
  const apiOrigin = process.env.NEXT_PUBLIC_FF_API_ORIGIN ?? "";
  return (apiOrigin === "" ? APP_URL : apiOrigin).replace(/\/$/, "");
}

export function buildReactLayoutSnippet(projectId: string) {
  const apiOrigin = isCloud() ? "" : ` apiOrigin="${getWidgetApiOrigin()}"`;
  return `import { FeedbackProvider } from "@fasterfixes/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <FeedbackProvider projectId="${projectId}"${apiOrigin}>
          {children}
        </FeedbackProvider>
      </body>
    </html>
  );
}`;
}

export function buildScriptEmbedSnippet(projectId: string) {
  if (isCloud()) {
    return `<script src="${SCRIPT_EMBED_URL}" data-project-id="${projectId}" defer></script>`;
  }
  const apiOrigin = getWidgetApiOrigin();
  return `<script src="${apiOrigin}/widget.iife.js" data-project-id="${projectId}" data-api-origin="${apiOrigin}" defer></script>`;
}
