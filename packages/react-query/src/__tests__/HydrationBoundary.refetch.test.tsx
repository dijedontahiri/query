import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { sleep } from '@tanstack/query-test-utils'
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  dehydrate,
  useQuery,
} from '..'

describe('HydrationBoundary refetch coordination', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should wait for newer hydration before deciding refetchOnMount', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)

    const queryKey = ['hydration-refetch']
    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKey, 'old-client-data')

    vi.setSystemTime(1_100)
    const serverQueryClient = new QueryClient()
    serverQueryClient.setQueryData(queryKey, 'fresh-server-data')
    const dehydratedState = dehydrate(serverQueryClient)

    const queryFn = vi.fn(() =>
      sleep(1_000).then(() => 'client-refetch-data'),
    )

    function Page() {
      const { data } = useQuery({
        queryKey,
        queryFn,
        staleTime: 50,
      })
      return <div>{data}</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <Page />
        </HydrationBoundary>
      </QueryClientProvider>,
    )

    await vi.advanceTimersByTimeAsync(0)

    expect(queryFn).toHaveBeenCalledTimes(0)
    expect(screen.getByText('fresh-server-data')).toBeInTheDocument()

    queryClient.clear()
    serverQueryClient.clear()
  })

  it('should refetch after hydration when the incoming data is already stale', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)

    const queryKey = ['stale-hydration-refetch']
    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKey, 'old-client-data')

    vi.setSystemTime(1_100)
    const serverQueryClient = new QueryClient()
    serverQueryClient.setQueryData(queryKey, 'stale-server-data')
    const dehydratedState = dehydrate(serverQueryClient)

    vi.setSystemTime(1_200)
    const queryFn = vi.fn(() =>
      sleep(10).then(() => 'client-refetch-data'),
    )

    function Page() {
      const { data } = useQuery({
        queryKey,
        queryFn,
        staleTime: 50,
      })
      return <div>{data}</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <Page />
        </HydrationBoundary>
      </QueryClientProvider>,
    )

    await vi.advanceTimersByTimeAsync(11)

    expect(queryFn).toHaveBeenCalledTimes(1)
    expect(screen.getByText('client-refetch-data')).toBeInTheDocument()

    queryClient.clear()
    serverQueryClient.clear()
  })

  it('should honor refetchOnMount always after hydration', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)

    const queryKey = ['always-hydration-refetch']
    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKey, 'old-client-data')

    vi.setSystemTime(1_100)
    const serverQueryClient = new QueryClient()
    serverQueryClient.setQueryData(queryKey, 'fresh-server-data')
    const dehydratedState = dehydrate(serverQueryClient)

    const queryFn = vi.fn(() =>
      sleep(10).then(() => 'client-refetch-data'),
    )

    function Page() {
      const { data } = useQuery({
        queryKey,
        queryFn,
        staleTime: 1_000,
        refetchOnMount: 'always',
      })
      return <div>{data}</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <Page />
        </HydrationBoundary>
      </QueryClientProvider>,
    )

    await vi.advanceTimersByTimeAsync(11)

    expect(queryFn).toHaveBeenCalledTimes(1)
    expect(screen.getByText('client-refetch-data')).toBeInTheDocument()

    queryClient.clear()
    serverQueryClient.clear()
  })
})
