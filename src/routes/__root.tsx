import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
// Self-hosted Tajawal — Google Fonts CDN is throttled/blocked on YemenNet,
// so we bundle the font instead of relying on fonts.googleapis.com.
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/900.css";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "../lib/cart";
import { I18nProvider } from "../lib/i18n";
import { Toaster } from "../components/ui/sonner";
import { AiChatWidget } from "../components/ai-chat-widget";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "صيدلية المصلي — رعاية صحية بلاحدود" },
      { name: "description", content: "صيدلية المصلي - تسوّق الأدوية ومنتجات العناية والتجميل والأجهزة الطبية مع توصيل سريع لجميع المحافظات." },
      { name: "author", content: "صيدلية المصلي" },
      { property: "og:title", content: "صيدلية المصلي — رعاية صحية بلاحدود" },
      { property: "og:description", content: "صيدلية المصلي - تسوّق الأدوية ومنتجات العناية والتجميل والأجهزة الطبية مع توصيل سريع لجميع المحافظات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "صيدلية المصلي — رعاية صحية بلاحدود" },
      { name: "twitter:description", content: "صيدلية المصلي - تسوّق الأدوية ومنتجات العناية والتجميل والأجهزة الطبية مع توصيل سريع لجميع المحافظات." },
      { property: "og:url", content: "https://muslly.com/" },
      { property: "og:site_name", content: "صيدلية المصلي" },
      { property: "og:locale", content: "ar_YE" },
      { property: "og:image", content: "https://muslly.com/__l5e/assets-v1/a8ea62c1-1cf3-4707-a017-db411980bb36/pharmacy-storefront.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "1200" },
      { name: "twitter:image", content: "https://muslly.com/__l5e/assets-v1/a8ea62c1-1cf3-4707-a017-db411980bb36/pharmacy-storefront.jpg" },
      { name: "theme-color", content: "#0e8f7a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "صيدلية المصلي" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      { name: "google-site-verification", content: "FOLYVj61xFYD4O-suyS4rWYrd60Q8Q3kFNHBGxUiabg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      // Tajawal is self-hosted via @fontsource — no Google Fonts CDN dependency.
      { rel: "dns-prefetch", href: "https://images.unsplash.com" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Install the client-side error logger once on mount (browser only).
    void import("../lib/client-error-logger").then((m) => m.installClientErrorLogger());
    // Anonymous network/error reporter — works for signed-out visitors too.
    void import("../lib/error-reporter").then((m) => m.installAnonErrorReporter());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <CartProvider>
          <Outlet />
          <AiChatWidget />
          <Toaster position="top-center" richColors />
        </CartProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

