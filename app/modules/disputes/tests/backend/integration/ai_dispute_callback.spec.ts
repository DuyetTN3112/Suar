/**
 * AI Dispute Callback Integration Tests
 *
 * Modularized for Clean Code & SOLID principles (Single Responsibility Principle).
 * Each sub-suite tests a focused domain slice (< 350 lines each):
 * - HTTP Callback API: ./ai_dispute_callback_http.spec.js
 * - Command Execution & Security: ./ai_dispute_callback_command_and_security.spec.js
 * - Workflow Sources: ./ai_dispute_callback_workflow_sources.spec.js
 */

import './ai_dispute_callback_http.spec.js'
import './ai_dispute_callback_command_and_security.spec.js'
import './ai_dispute_callback_workflow_sources.spec.js'
