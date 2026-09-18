'use client'
import * as React from 'react'

import type { QueryClient } from '@tanstack/query-core'

export type HydrationBoundaryContextValue = ReadonlyMap<
  QueryClient,
  ReadonlySet<string>
>

export const HydrationBoundaryContext =
  React.createContext<HydrationBoundaryContextValue>(new Map())
