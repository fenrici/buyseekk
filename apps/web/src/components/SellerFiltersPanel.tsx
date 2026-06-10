'use client';

import { AutoFilters, AutoFilterValues } from '@/components/AutoFilters';
import { RealEstateFilters, RealEstateFilterValues } from '@/components/RealEstateFilters';
import { ZoneChips } from '@/components/ZoneChips';
import { useT } from '@/lib/i18n';
import { User } from '@/lib/types';

type FilterOption = { id: string; label: string };

type Props = {
  user: User;
  category: string;
  onCategoryChange?: (id: string) => void;
  operation: string;
  onOperationChange: (id: string) => void;
  location: string;
  onLocationChange: (city: string) => void;
  zone: string;
  onZoneChange: (zone: string) => void;
  estateFilters: RealEstateFilterValues;
  onEstateFiltersChange: (next: RealEstateFilterValues) => void;
  autoFilters: AutoFilterValues;
  onAutoFiltersChange: (next: AutoFilterValues) => void;
  categoryFilters: FilterOption[];
  operationFilters: FilterOption[];
  cities: string[];
  showCategoryFilter?: boolean;
};

export function SellerFiltersPanel({
  user,
  category,
  onCategoryChange,
  operation,
  onOperationChange,
  location,
  onLocationChange,
  zone,
  onZoneChange,
  estateFilters,
  onEstateFiltersChange,
  autoFilters,
  onAutoFiltersChange,
  categoryFilters,
  operationFilters,
  cities,
  showCategoryFilter = true,
}: Props) {
  const t = useT();

  return (
    <div className="seller-filters-panel">
      <p className="seller-filters-heading">{t('seller.filtersTitle')}</p>

      {showCategoryFilter && (
        <div className="seller-filter-group">
          <span className="seller-filter-label">{t('request.category')}</span>
          <div className="explore-pills seller-filter-pills">
            {categoryFilters.map((c) => (
              <button
                key={c.id || 'all'}
                type="button"
                onClick={() => {
                  onCategoryChange?.(c.id);
                  if (c.id === 'AUTOS') onOperationChange('');
                }}
                className={`explore-pill ${category === c.id ? 'active' : ''}`}
                aria-pressed={category === c.id}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {category !== 'AUTOS' && (
        <div className="seller-filter-group">
          <span className="seller-filter-label">{t('seller.filterOperation')}</span>
          <div className="explore-pills seller-filter-pills">
            {operationFilters.map((op) => (
              <button
                key={op.id || 'all-ops'}
                type="button"
                onClick={() => onOperationChange(op.id)}
                className={`explore-pill ${operation === op.id ? 'active' : ''}`}
                aria-pressed={operation === op.id}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="seller-filter-group">
        <span className="seller-filter-label">{t('seller.filterCity')}</span>
        <div className="explore-pills seller-filter-pills">
          <button
            type="button"
            onClick={() => {
              onLocationChange('');
              onZoneChange('');
            }}
            className={`explore-pill ${location === '' ? 'active' : ''}`}
            aria-pressed={location === ''}
          >
            {t('seller.allCities')}
          </button>
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                onLocationChange(city);
                onZoneChange('');
              }}
              className={`explore-pill ${location === city ? 'active' : ''}`}
              aria-pressed={location === city}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      <div className="seller-filter-group">
        <span className="seller-filter-label">{t('request.zone')}</span>
        <ZoneChips
          country={user.country}
          city={location}
          value={zone}
          onChange={onZoneChange}
        />
      </div>

      <RealEstateFilters
        visible={category === '' || category === 'INMOBILIARIA'}
        values={estateFilters}
        onChange={onEstateFiltersChange}
        compact
      />

      <AutoFilters
        visible={category === '' || category === 'AUTOS'}
        values={autoFilters}
        onChange={onAutoFiltersChange}
        compact
      />
    </div>
  );
}
