import { protectedRoutes } from './protected-routes';

describe('edge installations route', () => {
  it('requires the dedicated edge permission and remains cloud-only', () => {
    const route = protectedRoutes.find(
      (candidate) => candidate.path === '/admin/edge-installations',
    );
    expect(route).toMatchObject({
      permissions: ['edge_installation_manage'],
      cloudOnly: true,
    });
  });
});
