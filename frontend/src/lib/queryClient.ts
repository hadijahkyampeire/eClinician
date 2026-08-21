import { QueryClient } from '@tanstack/react-query'

/**
 * A session that has ended will not un-end, so retrying it only fills the network tab
 * with 401s and hides the real reason behind "could not reach the API". Everything else
 * keeps the default retries.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !/session has ended/i.test(error.message) && failureCount < 3,
    },
  },
})
