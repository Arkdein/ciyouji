// Small inline SVG icon set (stroke icons, 24px grid) so nothing depends on emoji rendering.
const P = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  book: 'M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5ZM5 17a3 3 0 0 1 3-3h10.5',
  news: 'M5 5h11v14H7a2 2 0 0 1-2-2V5Zm11 3h3v9a2 2 0 0 1-2 2M8 9h5M8 12.5h5M8 16h3',
  chart: 'M5 20V10m5 10V4m5 16v-7m5 7H3',
  flame: 'M12 3c1 3.2 5 5.2 5 10a5 5 0 0 1-10 0c0-2 1-3.3 2-4.3.2 1.4.9 2.2 1.8 2.5C10.5 8.4 11 5.6 12 3Z',
  speaker: 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Zm11 .5a3.2 3.2 0 0 1 0 4m2.2-6.4a6.2 6.2 0 0 1 0 8.8',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  cross: 'M6 6l12 12M18 6 6 18',
  close: 'M6 6l12 12M18 6 6 18',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  print: 'M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z',
  send: 'M20 4 10 14m10-10-6.5 16-3.5-6-6-3.5L20 4Z',
  cap: 'M3 9.5 12 5l9 4.5-9 4.5-9-4.5Zm4.5 2.8V16c1.2 1.3 2.8 2 4.5 2s3.3-.7 4.5-2v-3.7',
  pin: 'M12 21s6-5.6 6-10.5a6 6 0 1 0-12 0C6 15.4 12 21 12 21Zm0-8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  flag: 'M6 21V4m0 1h11l-2.2 3.5L17 12H6',
  pen: 'M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16l-1 4Zm10.5-12.5 3 3',
  star: 'M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  target: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-4.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
};
export function Icon({ name, class: cls = '' }) {
  return (
    <svg class={`icon ${cls}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
