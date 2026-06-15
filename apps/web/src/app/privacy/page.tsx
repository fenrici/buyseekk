'use client';

import { LegalDocument } from '@/components/LegalDocument';
import { useT } from '@/lib/i18n';

export default function PrivacyPage() {
  const t = useT();
  const sections = [
    { title: t('legal.privacy.s1Title'), body: t('legal.privacy.s1Body') },
    { title: t('legal.privacy.s2Title'), body: t('legal.privacy.s2Body') },
    { title: t('legal.privacy.s3Title'), body: t('legal.privacy.s3Body') },
    { title: t('legal.privacy.s4Title'), body: t('legal.privacy.s4Body') },
    { title: t('legal.privacy.s5Title'), body: t('legal.privacy.s5Body') },
  ];

  return <LegalDocument title={t('legal.privacy.title')} updated={t('legal.updated')} sections={sections} activeRoute="/privacy" />;
}
