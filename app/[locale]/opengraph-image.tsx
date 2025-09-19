import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/lib/i18n/config";
import { OG_IMAGE_SIZE, getLocaleSeo, siteMetadata } from "@/lib/seo/config";

export const runtime = "edge";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params?.locale);
  const seo = getLocaleSeo(locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e293b 100%)",
          color: "#e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            fontSize: 28,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              backgroundColor: "#38bdf8",
              boxShadow: "0 0 24px rgba(56, 189, 248, 0.45)",
            }}
          />
          <span>{siteMetadata.shortName}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
          }}
        >
          <span
            style={{
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#f8fafc",
            }}
          >
            {seo.ogTitle}
          </span>
          <span
            style={{
              fontSize: 36,
              lineHeight: 1.35,
              color: "rgba(226, 232, 240, 0.85)",
              maxWidth: 880,
            }}
          >
            {seo.ogDescription}
          </span>
        </div>
        <span
          style={{
            fontSize: 28,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(148, 163, 184, 0.9)",
          }}
        >
          {seo.tagLine}
        </span>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
    }
  );
}

function resolveLocale(rawLocale: string | undefined): Locale {
  if (!rawLocale) {
    notFound();
  }

  if (isLocale(rawLocale)) {
    return rawLocale;
  }

  notFound();
}
