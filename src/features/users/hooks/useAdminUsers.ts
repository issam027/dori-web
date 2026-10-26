import { useQuery } from '@tanstack/react-query';
import type {
  CurrentUserResponseDto,
  UsersControllerFindUsersParams,
} from '@/api/generated/models';
import { queryKeys } from '@/api/client/query-keys';
import { findUserById, findUsers } from '@/features/onboarding/public';

export function useAdminUsers(
  page: number,
  filters: { search: string; userType: string; sort: string },
  current: CurrentUserResponseDto | null,
) {
  return useQuery({
    queryKey: queryKeys.admin.usersPage(page, filters),
    queryFn: ({ signal }) =>
      findUsers(
        {
          page,
          pageSize: 10,
          sort: filters.sort as UsersControllerFindUsersParams['sort'],
          siteIds:
            current && !current.scope.isGlobal && current.scope.siteIds.length
              ? current.scope.siteIds.join(',')
              : undefined,
          search: filters.search || undefined,
          userType: (filters.userType || undefined) as UsersControllerFindUsersParams['userType'],
        },
        undefined,
        signal,
      ),
  });
}

export function useAdminUserDetail(userId?: string) {
  return useQuery({
    queryKey: queryKeys.admin.userDetail(userId),
    queryFn: ({ signal }) => findUserById(userId ?? '', undefined, signal),
    enabled: Boolean(userId),
  });
}
