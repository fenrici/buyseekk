import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  defaultCurrencyForCountry,
  parseLaunchCountry,
  type Country,
  type Currency,
} from '@buyseekk/shared';

export function getLaunchCountry(config?: ConfigService): Country | null {
  const raw = config?.get<string>('LAUNCH_COUNTRY') ?? process.env.LAUNCH_COUNTRY;
  return parseLaunchCountry(raw);
}

export function resolveRegisterCountry(dtoCountry: Country, config?: ConfigService): Country {
  const launch = getLaunchCountry(config);
  if (launch) return launch;
  return dtoCountry;
}

export function assertRegisterCountryAllowed(dtoCountry: Country, config?: ConfigService): void {
  const launch = getLaunchCountry(config);
  if (launch && dtoCountry !== launch) {
    throw new BadRequestException('Registration is not available for this country in the current launch');
  }
}

/** Blocks AR (or other) accounts when the API runs in single-country launch mode. */
export function assertLaunchMarketAccess(userCountry: Country, config?: ConfigService): void {
  const launch = getLaunchCountry(config);
  if (launch && userCountry !== launch) {
    throw new ForbiddenException('Buyseek is currently available in the United States only');
  }
}

export function resolveRegisterCurrency(
  dtoCountry: Country,
  dtoCurrency: string | undefined,
  config?: ConfigService,
): Currency {
  const country = resolveRegisterCountry(dtoCountry, config);
  if (getLaunchCountry(config)) {
    return defaultCurrencyForCountry(country);
  }
  return (dtoCurrency as Currency | undefined) ?? defaultCurrencyForCountry(country);
}
