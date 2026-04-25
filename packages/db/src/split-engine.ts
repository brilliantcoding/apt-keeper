import type { BillSplitMethod } from './types'

interface Unit {
  id: string
  sq_ft?: number | null
  occupants?: number
  meter_reading?: number
  usage?: number
}

interface SplitRule {
  method: BillSplitMethod
  config: Record<string, unknown>
}

export function calculateSplit(
  totalAmountCents: number,
  units: Unit[],
  rule: SplitRule | null
): Record<string, number> {
  if (!units.length) return {}
  const method = rule?.method ?? 'equal'
  const config = rule?.config ?? {}

  switch (method) {
    case 'equal': {
      const share = Math.floor(totalAmountCents / units.length)
      const remainder = totalAmountCents - share * units.length
      return Object.fromEntries(
        units.map((u, i) => [u.id, share + (i === 0 ? remainder : 0)])
      )
    }

    case 'sq_ft': {
      const totalSqFt = units.reduce((sum, u) => sum + (u.sq_ft ?? 0), 0)
      if (totalSqFt === 0) return calculateSplit(totalAmountCents, units, { method: 'equal', config: {} })
      return Object.fromEntries(
        units.map((u) => [u.id, Math.round(totalAmountCents * ((u.sq_ft ?? 0) / totalSqFt))])
      )
    }

    case 'occupancy': {
      const totalOccupants = units.reduce((sum, u) => sum + (u.occupants ?? 1), 0)
      if (totalOccupants === 0) return calculateSplit(totalAmountCents, units, { method: 'equal', config: {} })
      return Object.fromEntries(
        units.map((u) => [u.id, Math.round(totalAmountCents * ((u.occupants ?? 1) / totalOccupants))])
      )
    }

    case 'percentage': {
      const percentages = config.percentages as Record<string, number>
      return Object.fromEntries(
        units.map((u) => [u.id, Math.round(totalAmountCents * ((percentages?.[u.id] ?? 0) / 100))])
      )
    }

    case 'fixed': {
      const fixedAmounts = config.fixed_amounts as Record<string, number>
      return Object.fromEntries(
        units.map((u) => [u.id, fixedAmounts?.[u.id] ?? 0])
      )
    }

    case 'metered': {
      const totalReading = units.reduce((sum, u) => sum + (u.meter_reading ?? 0), 0)
      if (totalReading === 0) return calculateSplit(totalAmountCents, units, { method: 'equal', config: {} })
      return Object.fromEntries(
        units.map((u) => [u.id, Math.round(totalAmountCents * ((u.meter_reading ?? 0) / totalReading))])
      )
    }

    case 'tiered': {
      const tiers = config.tiers as Array<{ up_to: number; rate_cents: number }>
      if (!tiers?.length) return calculateSplit(totalAmountCents, units, { method: 'equal', config: {} })
      return Object.fromEntries(
        units.map((u) => {
          const usage = u.usage ?? 0
          let cost = 0
          let remaining = usage
          for (const tier of tiers) {
            if (remaining <= 0) break
            const inTier = Math.min(remaining, tier.up_to)
            cost += inTier * tier.rate_cents
            remaining -= inTier
          }
          return [u.id, cost]
        })
      )
    }

    default:
      return calculateSplit(totalAmountCents, units, { method: 'equal', config: {} })
  }
}
