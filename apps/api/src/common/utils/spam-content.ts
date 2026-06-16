import { BadRequestException } from '@nestjs/common';
import {
  contentFingerprint,
  detectSpamIssue,
  MAX_OFFERS_PER_HOUR,
  SPAM_DUPLICATE_DAYS,
  type SpamIssue,
} from '@buyseekk/shared';
import { PrismaService } from '../../prisma/prisma.service';

const ISSUE_MESSAGES: Record<SpamIssue, (field: string) => string> = {
  phone: (field) =>
    `No podés incluir teléfonos ni datos de contacto en ${field}. Una vez aceptada una oferta, vas a poder intercambiar números por el chat de Buyseek.`,
  link: (field) => `No podés incluir enlaces en ${field}.`,
  email: (field) => `No podés incluir emails en ${field}.`,
  social: (field) => `No podés incluir redes sociales ni usuarios @ en ${field}.`,
  low_quality: (field) =>
    `El contenido de ${field} parece spam o no tiene suficiente detalle. Escribí una descripción clara de lo que buscás u ofrecés.`,
};

export function assertCleanPublicText(text: string | undefined | null, fieldLabel: string) {
  if (!text?.trim()) return;
  const issue = detectSpamIssue(text);
  if (issue) {
    throw new BadRequestException(ISSUE_MESSAGES[issue](fieldLabel));
  }
}

function duplicateCutoff() {
  const d = new Date();
  d.setDate(d.getDate() - SPAM_DUPLICATE_DAYS);
  return d;
}

function hourCutoff() {
  const d = new Date();
  d.setHours(d.getHours() - 1);
  return d;
}

export async function assertNoDuplicateRequest(
  prisma: PrismaService,
  userId: string,
  requirements: string,
  title?: string | null,
  excludeRequestId?: string,
) {
  const fp = contentFingerprint(requirements);
  const titleFp = title?.trim() ? contentFingerprint(title) : null;

  const recent = await prisma.request.findMany({
    where: {
      userId,
      ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      OR: [{ active: true }, { createdAt: { gte: duplicateCutoff() } }],
    },
    select: { requirements: true, title: true },
  });

  const isDup = recent.some((r) => {
    if (contentFingerprint(r.requirements) === fp) return true;
    return titleFp != null && contentFingerprint(r.title) === titleFp;
  });

  if (isDup) {
    throw new BadRequestException(
      'Ya publicaste una solicitud muy similar. Editá la existente en lugar de duplicarla.',
    );
  }
}

export async function assertOfferSpamLimits(
  prisma: PrismaService,
  sellerId: string,
  message: string,
) {
  const sinceHour = hourCutoff();
  const offersLastHour = await prisma.offer.count({
    where: { sellerId, createdAt: { gte: sinceHour } },
  });

  if (offersLastHour >= MAX_OFFERS_PER_HOUR) {
    throw new BadRequestException(
      `Podés enviar hasta ${MAX_OFFERS_PER_HOUR} ofertas por hora. Esperá un momento e intentá de nuevo.`,
    );
  }

  const msgFp = contentFingerprint(message);
  const recentMessages = await prisma.offer.findMany({
    where: { sellerId, createdAt: { gte: duplicateCutoff() } },
    select: { message: true },
  });

  if (recentMessages.some((o) => contentFingerprint(o.message) === msgFp)) {
    throw new BadRequestException(
      'Ya enviaste una oferta con el mismo texto. Personalizá tu propuesta para cada solicitud.',
    );
  }
}
