const RULES = new Intl.PluralRules('ru-RU');

const SLOT_FORMS: Record<Intl.LDMLPluralRule, string> = {
  zero: 'слотов',
  one: 'слот',
  two: 'слота',
  few: 'слота',
  many: 'слотов',
  other: 'слотов',
};

/** `4` → `4 слота` */
export function formatSlotCount(count: number): string {
  return `${count} ${SLOT_FORMS[RULES.select(count)]}`;
}
