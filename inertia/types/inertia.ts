/**
 * Inertia Page Component Types
 *
 * Defines proper types for Svelte 5 Inertia page components
 */

import type { Component } from 'svelte'

/**
 * Inertia Page Module
 * Represents the result from import.meta.glob for .svelte files
 */
export interface InertiaPageModule {
  default: Component
  [key: string]: unknown
}

/**
 * Page Component Record
 * Type for the object returned by import.meta.glob
 */
export type PageComponentRecord = Record<string, InertiaPageModule>

/**
 * Inertia Setup Props
 * Props passed to the setup function in createInertiaApp
 */
export interface InertiaSetupProps<TProps = Record<string, unknown>> {
  el: HTMLElement
  App: Component
  props: TProps
}
