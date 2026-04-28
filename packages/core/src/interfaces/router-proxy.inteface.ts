/**
 * Core re-exports router-related types by reference.
 * This avoids a hard dependency between @vydra-js/core and @vydra-js/router.
 * Consumers use these when configuring createMicrofrontendApp.
 */
export type { VydraRoute as VydraRouteRef } from '@vydra-js/shared';
export type { VydraNavigation as VydraNavigationRef } from '@vydra-js/shared';
