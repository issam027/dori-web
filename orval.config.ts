import { defineConfig } from 'orval';

export default defineConfig({
  dori: {
    input: {
      target: './specifications/docs-json.json',
      override: {
        transformer: './tools/openapi/normalize-spec.mjs',
      },
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/dori.ts',
      schemas: './src/api/generated/models',
      client: 'react-query',
      httpClient: 'axios',
      mock: {
        generators: [{ type: 'msw', useExamples: true }],
      },
      clean: true,
      formatter: 'prettier',
      override: {
        mutator: {
          path: './src/api/client/http-client.ts',
          name: 'request',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});
