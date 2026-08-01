export function buildPublicCommentSearchTerms(query: string): string[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return []

  const terms = new Set<string>([normalizedQuery])
  const dIndexes = Array.from(normalizedQuery)
    .map((char, index) => ({ char, index }))
    .filter(({ char }) => char === 'd')
    .map(({ index }) => index)

  for (const variant of buildSingleCharacterVariants(normalizedQuery)) {
    terms.add(variant)
  }

  for (const dIndex of dIndexes) {
    terms.add(replaceAt(normalizedQuery, dIndex, 'đ'))
    for (const variant of buildSingleCharacterVariants(replaceAt(normalizedQuery, dIndex, 'đ'))) {
      terms.add(variant)
      if (terms.size >= 64) break
    }
    if (terms.size >= 64) break
  }

  return [...terms].slice(0, 64)
}

function buildSingleCharacterVariants(value: string): string[] {
  const variants: string[] = []
  const chars = Array.from(value)

  chars.forEach((char, index) => {
    for (const replacement of vietnameseCharacterVariants(char)) {
      if (replacement !== char) {
        variants.push(
          `${chars.slice(0, index).join('')}${replacement}${chars.slice(index + 1).join('')}`
        )
      }
    }
  })

  return variants
}

function vietnameseCharacterVariants(char: string): string[] {
  const groups: Record<string, string[]> = {
    a: ['a', 'á', 'à', 'ả', 'ã', 'ạ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ'],
    e: ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ'],
    i: ['i', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
    o: ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ'],
    u: ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự'],
    y: ['y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ'],
  }

  return groups[char] ?? [char]
}

function replaceAt(value: string, index: number, replacement: string): string {
  const chars = Array.from(value)
  chars[index] = replacement
  return chars.join('')
}
