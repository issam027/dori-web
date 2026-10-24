import { updateFavicon } from './favicon';

describe('updateFavicon', () => {
  it('updates the tab icon with the active theme colors', () => {
    const link = document.createElement('link');
    link.rel = 'icon';
    document.head.append(link);

    updateFavicon('#087477', '#ffffff');

    expect(link.href).toContain('data:image/svg+xml');
    expect(decodeURIComponent(link.href)).toContain('fill="#087477"');
    expect(decodeURIComponent(link.href)).toContain('fill="#ffffff"');
    expect(decodeURIComponent(link.href)).toContain('>D</text>');
  });
});
