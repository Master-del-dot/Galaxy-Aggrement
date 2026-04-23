import type { FormField, Mapping } from '@/db';

const DATE_HINTS = ['date', 'day', 'month', 'year', 'deadline', 'expiry', 'dob'];
const NUMBER_HINTS = ['amount', 'price', 'cost', 'fee', 'rate', 'qty', 'quantity', 'number', 'total', 'percent'];

export function formatFieldName(placeholder: string): string {
  return placeholder
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function inferFieldType(name: string): FormField['type'] {
  const normalized = name.toLowerCase();

  if (DATE_HINTS.some((hint) => normalized.includes(hint))) {
    return 'date';
  }

  if (NUMBER_HINTS.some((hint) => normalized.includes(hint))) {
    return 'number';
  }

  return 'text';
}

export function createFieldsFromPlaceholders(placeholders: string[]): FormField[] {
  return placeholders.map((placeholder) => ({
    id: crypto.randomUUID(),
    name: formatFieldName(placeholder),
    type: inferFieldType(placeholder),
  }));
}

function similarityScore(left: string, right: string): number {
  const normalizedLeft = normalizeKey(left);
  const normalizedRight = normalizeKey(right);

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return 0.9;
  }

  const leftWords = left.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const rightWords = right.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  if (!leftWords.length || !rightWords.length) {
    return 0;
  }

  const sharedWords = leftWords.filter((word) => rightWords.includes(word)).length;
  return sharedWords / Math.max(leftWords.length, rightWords.length);
}

export function autoMapPlaceholders(placeholders: string[], fields: FormField[]): Mapping[] {
  const availableFields = fields.filter((field) => field.type !== 'file');
  const usedFieldIds = new Set<string>();

  return placeholders.map((placeholder) => {
    let bestFieldId = '';
    let bestScore = 0;

    availableFields.forEach((field) => {
      if (usedFieldIds.has(field.id)) {
        return;
      }

      const score = similarityScore(placeholder, field.name);
      if (score > bestScore) {
        bestScore = score;
        bestFieldId = field.id;
      }
    });

    if (bestScore >= 0.6 && bestFieldId) {
      usedFieldIds.add(bestFieldId);
    } else {
      bestFieldId = '';
    }

    return {
      placeholder,
      fieldId: bestFieldId,
    };
  });
}
