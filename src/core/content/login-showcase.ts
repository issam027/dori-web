export const loginShowcaseSlides = [
  'queues',
  'appointments',
  'supervision',
  'tracking',
  'management',
] as const;

export type LoginShowcaseSlide = (typeof loginShowcaseSlides)[number];

export const loginShowcaseKey = (
  slide: LoginShowcaseSlide,
  field: 'eyebrow' | 'title' | 'description' | 'metric',
) => `login.showcase.${slide}.${field}`;
