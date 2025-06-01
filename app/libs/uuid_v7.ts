import { randomBytes } from 'node:crypto'

/**
 * UUIDv7 Generator — Sprint 3: PostgreSQL Migration Prep
 *
 * UUIDv7 (RFC 9562) là time-sortable UUID format, ideal cho database primary keys.
 *
 * Ưu điểm so với UUIDv4:
 * - Time-sortable → B-tree index friendly (không random insert)
 * - Monotonically increasing → giảm page splits
 * - Embeds millisecond timestamp → natural ordering by creation time
 * - 128-bit → collision-resistant (same as UUIDv4)
 *
 * Format (128 bits):
 * ```
 * 0                   1                   2                   3
 * 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                         unix_ts_ms (48 bits)                  |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |  unix_ts_ms   | ver(4)|   rand_a (12 bits)  |var(2)| rand_b  |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                          rand_b (62 bits)                     |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * ```
 *
 * Usage:
 * ```typescript
 * import { generateUUIDv7, extractTimestamp } from '#libs/uuid_v7'
 *
 * const id = generateUUIDv7()
 * // → "01912345-6789-7abc-8def-0123456789ab"
 *
 * const timestamp = extractTimestamp(id)
 * // → Date object matching creation time
 * ```
 *
 * @module UUIDv7
 * @see https://www.rfc-editor.org/rfc/rfc9562#name-uuid-version-7
 */

/**
 * Lookup table for fast byte→hex conversion
 */
const HEX_TABLE: string[] = []
for (let i = 0; i < 256; i++) {
  HEX_TABLE.push(i.toString(16).padStart(2, '0'))
}

/**
 * Helper: Get hex string for a byte value from Uint8Array
 */
function byteToHex(bytes: Uint8Array, index: number): string {
  const byte = bytes[index] ?? 0
  return HEX_TABLE[byte] ?? '00'
}

/**
 * Previous timestamp — for monotonicity within same millisecond
 */
let lastTimestamp = 0
let sequenceCounter = 0

/**
 * Generate a UUIDv7 string.
 *
 * Thread-safe within a single Node.js process (single-threaded).
 * Uses crypto.randomBytes for cryptographic randomness.
 *
 * @returns UUIDv7 string in format "xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx"
 */
export function generateUUIDv7(): string {
  let timestamp = Date.now()

  // Monotonicity: if same millisecond, increment sequence
  if (timestamp === lastTimestamp) {
    sequenceCounter++
    // If sequence overflows 12-bit (4096), advance timestamp
    if (sequenceCounter > 0xfff) {
      // Spin-wait until next millisecond (extremely rare)
      while (timestamp === lastTimestamp) {
        timestamp = Date.now()
      }
      sequenceCounter = 0
    }
  } else {
    sequenceCounter = 0
  }
  lastTimestamp = timestamp

  // Allocate 16 bytes
  const bytes = new Uint8Array(16)

  // Fill bytes 6-15 with random data
  const random = randomBytes(10)
  bytes.set(random, 6)

  // Bytes 0-5: 48-bit Unix timestamp in milliseconds (big-endian)
  bytes[0] = (timestamp / 2 ** 40) & 0xff
  bytes[1] = (timestamp / 2 ** 32) & 0xff
  bytes[2] = (timestamp / 2 ** 24) & 0xff
  bytes[3] = (timestamp / 2 ** 16) & 0xff
  bytes[4] = (timestamp / 2 ** 8) & 0xff
  bytes[5] = timestamp & 0xff

  // Byte 6: version (0111 = 7) in high nibble + rand_a high nibble
  // Use sequence for rand_a to ensure monotonicity within same ms
  bytes[6] = 0x70 | ((sequenceCounter >> 8) & 0x0f)

  // Byte 7: rand_a low byte (sequence low 8 bits)
  bytes[7] = sequenceCounter & 0xff

  // Byte 8: variant (10xx) in high 2 bits + rand_b high 6 bits
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  // Format as UUID string
  return (
    byteToHex(bytes, 0) +
    byteToHex(bytes, 1) +
    byteToHex(bytes, 2) +
    byteToHex(bytes, 3) +
    '-' +
    byteToHex(bytes, 4) +
    byteToHex(bytes, 5) +
    '-' +
    byteToHex(bytes, 6) +
    byteToHex(bytes, 7) +
    '-' +
    byteToHex(bytes, 8) +
    byteToHex(bytes, 9) +
    '-' +
    byteToHex(bytes, 10) +
    byteToHex(bytes, 11) +
    byteToHex(bytes, 12) +
    byteToHex(bytes, 13) +
    byteToHex(bytes, 14) +
    byteToHex(bytes, 15)
  )
}

/**
 * Extract the timestamp from a UUIDv7 string.
 *
 * @param uuid - UUIDv7 string
 * @returns Date object representing when the UUID was generated
 * @throws Error if UUID format is invalid
 */
export function extractTimestamp(uuid: string): Date {
  const hex = uuid.replace(/-/g, '')

  if (hex.length !== 32) {
    throw new Error(`Invalid UUID format: ${uuid}`)
  }

  // First 12 hex chars = 48-bit timestamp
  const timestampHex = hex.slice(0, 12)
  const timestamp = Number.parseInt(timestampHex, 16)

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid timestamp in UUID: ${uuid}`)
  }

  return new Date(timestamp)
}

/**
 * Validate if a string is a valid UUIDv7.
 *
 * Checks:
 * - UUID format (8-4-4-4-12 hex)
 * - Version nibble = 7
 * - Variant bits = 10xx
 *
 * @param value - String to validate
 * @returns true if valid UUIDv7
 */
export function isUUIDv7(value: string): boolean {
  const uuidv7Regex = /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i
  return uuidv7Regex.test(value)
}

/**
 * Generate a batch of UUIDv7s.
 * All UUIDs in the batch are guaranteed to be monotonically increasing.
 *
 * @param count - Number of UUIDs to generate
 * @returns Array of UUIDv7 strings
 */
export function generateUUIDv7Batch(count: number): string[] {
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(generateUUIDv7())
  }
  return result
}

/**
 * Compare two UUIDv7s chronologically.
 *
 * Since UUIDv7 embeds timestamp, string comparison gives chronological order.
 *
 * @param a - First UUIDv7
 * @param b - Second UUIDv7
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareUUIDv7(a: string, b: string): number {
  return a.localeCompare(b)
}

/**
 * PostgreSQL function to generate UUIDv7 server-side.
 *
 * Use this when creating the PostgreSQL schema to ensure
 * UUIDv7 generation is consistent between app and DB.
 *
 * @returns SQL statement to create the gen_random_uuid_v7() function
 */
export function getPostgresUUIDv7FunctionSQL(): string {
  return `
-- UUIDv7 generator function for PostgreSQL
-- RFC 9562 compliant, time-sortable
CREATE OR REPLACE FUNCTION gen_random_uuid_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  -- Get current Unix timestamp in milliseconds
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);

  -- Build 16 random bytes
  uuid_bytes = gen_random_bytes(16);

  -- Set first 6 bytes to timestamp
  uuid_bytes = overlay(uuid_bytes placing unix_ts_ms from 1 for 6);

  -- Set version to 7 (0111xxxx)
  uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);

  -- Set variant to RFC 4122 (10xxxxxx)
  uuid_bytes = set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);

  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;

-- Comment for documentation
COMMENT ON FUNCTION gen_random_uuid_v7() IS 'Generate RFC 9562 UUIDv7 (time-sortable UUID)';
`.trim()
}
