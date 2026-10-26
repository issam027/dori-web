import { useQuery } from '@tanstack/react-query';
import type { TranslationsControllerFindTranslationsParams } from '@/api/generated/models';
import { queryKeys } from '@/api/client/query-keys';
import { findTranslations } from '../api/translations-api';

export function useAdminTranslations(
  page: number,
  filters: { key: string; category: string; locale: string },
) {
  return useQuery({
    queryKey: queryKeys.admin.translationsPage(page, filters),
    queryFn: ({ signal }) =>
      findTranslations(
        {
          page,
          pageSize: 10,
          sort: 'translationKey:asc',
          key: filters.key || undefined,
          category: (filters.category ||
            undefined) as TranslationsControllerFindTranslationsParams['category'],
          locale: filters.locale || undefined,
        },
        undefined,
        signal,
      ),
  });
}
