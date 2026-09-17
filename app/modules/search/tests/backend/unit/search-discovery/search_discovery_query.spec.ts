/**
 * Search Discovery Query Unit Tests
 *
 * Modularized for Clean Code & SOLID principles (Single Responsibility Principle).
 * Each sub-suite tests a focused domain slice (< 300 lines each):
 * - Criteria & Normalization: ./search_discovery_query_criteria_and_normalization.spec.js
 * - Blended Contexts & Legacy Compatibility: ./search_discovery_query_blended_and_compatibility.spec.js
 * - Errors, Aborts & Diagnostics: ./search_discovery_query_error_and_diagnostics.spec.js
 */

import './search_discovery_query_criteria_and_normalization.spec.js'
import './search_discovery_query_blended_and_compatibility.spec.js'
import './search_discovery_query_error_and_diagnostics.spec.js'
