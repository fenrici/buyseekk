/** Umbrales de reportes únicos para la moderación automática por comunidad. */
export const MODERATION_THRESHOLDS = {
  /** Marca el contenido para revisión y lo destaca en el panel admin. */
  REVIEW_REQUIRED: 10,
  /** Oculta el contenido del marketplace (sigue visible para su dueño). */
  HIDE_CONTENT: 15,
  /** Suspende preventivamente al usuario reportado. */
  SUSPEND_USER: 25,
  /** Prioridad máxima + alerta en el dashboard admin. */
  MAX_PRIORITY: 50,
} as const;

export const AUTO_SUSPENSION_REASON =
  'Suspensión automática preventiva mientras revisamos varios reportes de la comunidad.';
