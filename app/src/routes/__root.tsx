import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { DoorIntro } from "@/components/door-intro";
import appCss from "../styles.css?url";

const APP_NAME = "P4R53L_ℭ𝔥𝔞𝔪𝔢𝔩𝔢𝔬𝔫";

/** Same public-host guard the injector uses for og:image. Vercel system hosts are rejected. */
function publicBannerHost(raw: string | undefined): string {
  const host = String(raw ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  if (!host || !/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) return "";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return "";
  if (
    host === "vercel.app" ||
    host.endsWith(".vercel.app") ||
    host === "vercel.com" ||
    host.endsWith(".vercel.com")
  ) {
    return "";
  }
  return host;
}

function xFeedHost(): string {
  const published = publicBannerHost(import.meta.env.VITE_PUBLIC_HOSTNAME);
  if (published) return published;
  if (typeof window !== "undefined") return publicBannerHost(window.location.hostname);
  return "";
}

export const Route = createRootRoute({
  head: () => {
    const host = xFeedHost();
    const meta: Array<
      | { charSet: string }
      | { title: string }
      | { name: string; content: string }
      | { property: string; content: string }
    > = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "A spell book for transforming text. Secrets keeps each original beside its result.",
      },
      { name: "theme-color", content: "#07110d" },
    ];
    if (host) {
      const xBanner = `https://${host}/x-banner.jpg`;
      meta.push({ property: "x:game:image", content: xBanner });
    }
    return {
      meta,
      links: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "stylesheet", href: appCss },
        { rel: "manifest", href: "/__grok/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      ],
    };
  },
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <DoorIntro />
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
