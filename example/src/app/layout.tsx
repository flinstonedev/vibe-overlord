import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { validateEnvironment } from "vibe-overlord";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vibe Overlord Example",
  description: "AI-powered React component generation with multiple providers",
};

// Validate environment on app startup
if (typeof window === 'undefined') { // Only run on server
  const envValidation = validateEnvironment();
  if (!envValidation.isValid) {
    console.error('🚨 Environment validation failed:', envValidation.errors);
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting due to environment validation failures in production');
      process.exit(1);
    } else {
      console.warn('⚠️  Environment validation warnings (development mode):');
      envValidation.errors.forEach(error => console.warn(`   - ${error}`));
    }
  } else {
    console.log('✅ Environment validation passed');
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
