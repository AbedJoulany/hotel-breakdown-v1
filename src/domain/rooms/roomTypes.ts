export interface RoomType {
  code: string;
  en: string;
  he: string;
}

export const ROOM_TYPES: readonly RoomType[] = [
  { code: 'STR', en: 'Orient Room', he: 'חדר אוריינט' },
  { code: 'SGR', en: 'Orient Garden Room', he: 'חדר אוריינט גן' },
  { code: 'SCR', en: 'Orient Colony City View Room', he: 'חדר אוריינט נוף למושבה' },
  { code: 'SOR', en: 'Orient Old City View Room', he: 'חדר אוריינט נוף לעיר העתיקה' },
  { code: 'TEXR', en: 'Templer Executive Room', he: 'טמפלר אקזקיוטיב' },
  { code: 'TSTR', en: 'Templer Standard Room', he: 'חדר טמפלר' },
  { code: 'TSUR', en: 'Templer Deluxe Room', he: 'חדר טמפלר דלוקס' },
  { code: 'FAP', en: 'Family Room', he: 'חדר משפחה' },
  { code: 'ZSR', en: 'Orient Suite', he: 'סוויטת אוריינט' },
  { code: 'ZCR', en: 'Orient Colony View Suite', he: 'סוויטת אוריינט נוף למושבה' },
  { code: 'ZOR', en: 'Orient Old City View Suite', he: 'סוויטת אוריינט נוף לעיר העתיקה' },
  { code: 'ZPR', en: 'Presidential Suite', he: 'סוויטה נשיאותית' },
  { code: 'ZRR', en: 'Orient Royal Suite', he: 'סוויטת אוריינט רויאל' },
  { code: 'ZER', en: 'Colony Suite', he: 'סוויטת קולוני' },
  { code: 'STRC', en: 'Orient Connecting Room', he: '' },
] as const;

export type RoomTypeCode = (typeof ROOM_TYPES)[number]['code'];

export function findRoomType(code: string): RoomType | undefined {
  return ROOM_TYPES.find((roomType) => roomType.code === code);
}
