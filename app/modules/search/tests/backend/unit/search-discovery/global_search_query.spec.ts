/**
 * Global Search Query Unit Tests
 *
 * Modularized for Clean Code & SOLID principles (Single Responsibility Principle).
 * Each sub-suite tests a focused domain slice (< 450 lines each):
 * - Fanout & Input Validation: ./global_search_query_fanout.spec.js
 * - Ranking & Normalization: ./global_search_query_ranking_and_normalization.spec.js
 * - Resilience & Fault Tolerance: ./global_search_query_resilience.spec.js
 */

import './global_search_query_fanout.spec.js'
import './global_search_query_ranking_and_normalization.spec.js'
import './global_search_query_resilience.spec.js'
