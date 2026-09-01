export type CreativeFormat = 'SHORT_FORM_30S' | 'SHORT_FORM_15S' | 'SHORT_FORM_60S' | 'LONG_FORM_2M';

export type CreativeProjectRow = {
  id: string;
  title: string;
  format: CreativeFormat;
  aspectRatio: string;
  status: string;
  createdAt: Date;
};
