'use client';

import { LegalDocument } from '@/components/LegalDocument';
import { useT } from '@/lib/i18n';

export default function CookiesPage() {
  const t = useT();
  const sections = [
    { title: t('legal.cookies.s1Title'), body: t('legal.cookies.s1Body') },
    { title: t('legal.cookies.s2Title'), body: t('legal.cookies.s2Body') },
    { title: t('legal.cookies.s3Title'), body: t('legal.cookies.s3Body') },
    { title: t('legal.cookies.s4Title'), body: t('legal.cookies.s4Body') },
  ];

  return <LegalDocument title={t('legal.cookies.title')} updated={t('legal.updated')} sections={sections} activeRoute="/cookies" />;
}
