import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js'

dayjs.extend(relativeTime)

export function parseRelativeDate(input: string): Date {
  const normalizedInput = input.toLowerCase().trim()

  // Handle ISO dates directly
  const isoDate = dayjs(input)
  if (isoDate.isValid() && input.includes('T')) {
    return isoDate.toDate()
  }

  // Handle relative dates
  switch (normalizedInput) {
    case 'yesterday':
      return dayjs().subtract(1, 'day').startOf('day').toDate()

    case 'last week':
      return dayjs().subtract(1, 'week').startOf('day').toDate()

    case 'today':
      return dayjs().startOf('day').toDate()
  }

  // Handle patterns like "3 days ago", "2 weeks ago", etc.
  const relativeMatch = normalizedInput.match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago$/i)
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch
    const numAmount = parseInt(amount, 10)

    let unitName = unit.toLowerCase()
    if (unitName.endsWith('s')) {
      unitName = unitName.slice(0, -1) // Remove plural 's'
    }

    return dayjs().subtract(numAmount, unitName as dayjs.ManipulateType).startOf('day').toDate()
  }

  // Try parsing as a regular date string
  const parsedDate = dayjs(input)
  if (parsedDate.isValid()) {
    return parsedDate.toDate()
  }

  throw new Error(`Unable to parse date: "${input}". Use formats like "yesterday", "last week", "3 days ago", or ISO dates.`)
}

export function formatDate(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

export function formatRelativeTime(date: Date | string): string {
  return dayjs(date).fromNow()
}

export function isValidDate(dateString: string): boolean {
  try {
    parseRelativeDate(dateString)
    return true
  } catch {
    return false
  }
}