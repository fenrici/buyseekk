import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of service — Buyseekk',
  description: 'Terms of service for using Buyseekk.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
