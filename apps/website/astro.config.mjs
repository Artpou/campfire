// @ts-check
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://seedarr.app",
  integrations: [
    react(),
    starlight({
      title: "Seedarr",
      description: "Your self-hosted media center — discover, download, and stream movies & TV shows.",
      favicon: "/favicon.svg",
      logo: {
        src: "./public/logo.svg",
        alt: "Seedarr",
      },
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/Artpou/seedarr" }],
      customCss: ["./src/styles/global.css"],
      sidebar: [
        {
          label: "Getting started",
          items: [
            { label: "Introduction", slug: "introduction" },
            { label: "Quick start", slug: "guides/quick-start" },
            { label: "Docker", slug: "guides/docker" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Features", slug: "guides/features" },
            { label: "General settings", slug: "guides/general" },
            { label: "Indexers", slug: "guides/indexers" },
            { label: "Remote storage", slug: "guides/remote-storage" },
            { label: "Users & roles", slug: "guides/users" },
            { label: "Activity", slug: "guides/activity" },
            { label: "Letterboxd", slug: "guides/letterboxd" },
            { label: "Contributing", slug: "guides/contributing" },
          ],
        },
        {
          label: "Reference",
          items: [{ label: "Architecture", slug: "reference/architecture" }],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
