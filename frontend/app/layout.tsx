/**
 * @overview Root layout component for the Hoagie Plan app. Styles apply to all children.
 *
 * Copyright © 2021-2024 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

import "./globals.css";
import "@/lib/hoagie-ui/Theme/theme.css";

import { ReactNode } from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSession } from "@auth0/nextjs-auth0";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { cookies } from "next/headers";

import Content from "@/app/content";

export const metadata: Metadata = {
  title: "Plan by Hoagie",
  description: "Princeton, All In One",
  manifest: "manifest.json",
};

async function fetchSession() {
  const cookieStore = cookies();

  const sessionCookie = cookieStore.get("appSession");
  if (!sessionCookie) {
    return null;
  }

  const session = await getSession();
  return session;
}

/**
 * RootLayout server side
 * Wraps the entire application with necessary providers and layouts.
 * Since Content maintains its own state, we need to pass it down as a client component prop.
 *
 * @param children - The child components to render within the layout.
 * @returns JSX Element representing the root HTML structure.
 */
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await fetchSession();

  return (
    <html lang="en" className="bg-hoagieplan-dark-yellow">
      <UserProvider>
        <body className="antialiased">
          <Content user={session?.user}>{children}</Content>
          <Analytics />
          <SpeedInsights />
        </body>
      </UserProvider>
    </html>
  );
}
