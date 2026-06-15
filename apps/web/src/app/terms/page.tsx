'use client';

import { LegalDocument } from '@/components/LegalDocument';
import { useT } from '@/lib/i18n';

export default function TermsPage() {
  const t = useT();
  const sections = [
    { title: t('legal.terms.s1Title'), body: t('legal.terms.s1Body') },
    { title: t('legal.terms.s2Title'), body: t('legal.terms.s2Body') },
    { title: t('legal.terms.s3Title'), body: t('legal.terms.s3Body') },
    { title: t('legal.terms.s4Title'), body: t('legal.terms.s4Body') },
    { title: t('legal.terms.s5Title'), body: t('legal.terms.s5Body') },
  ];

  return <LegalDocument title={t('legal.terms.title')} updated={t('legal.updated')} sections={sections} activeRoute="/terms" />;
}
