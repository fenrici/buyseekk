'use client';

import { useT } from '@/lib/i18n';

type Tab = 'publish' | 'mine';

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function BuyerPanelTabs({ activeTab, onTabChange }: Props) {
  const t = useT();

  return (
    <div className="panel-tabs mt-6">
      <button
        type="button"
        onClick={() => onTabChange('publish')}
        className={`panel-tab ${activeTab === 'publish' ? 'active' : ''}`}
      >
        {t('buyer.tabPublish')}
      </button>
      <button
        type="button"
        onClick={() => onTabChange('mine')}
        className={`panel-tab ${activeTab === 'mine' ? 'active' : ''}`}
      >
        {t('buyer.tabMine')}
      </button>
    </div>
  );
}
