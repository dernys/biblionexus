'use server'

import { requireAuthorizationContext } from '@/lib/authorization-context'
import { checkout, placeHold, renewLoan, returnItem } from '@/lib/services/circulation'

const actor = async () => requireAuthorizationContext()

export async function returnLoanAction(input: { loanId: string; branchId: string; itemId: string; condition?: string; idempotencyKey: string }) {
  return returnItem({ context: await actor(), ...input })
}

export async function checkoutAction(input: { memberId: string; itemId: string; branchId: string; daysToLoan?: number; idempotencyKey: string }) {
  return checkout({ context: await actor(), ...input })
}

export async function renewLoanAction(input: { loanId: string; memberId: string; idempotencyKey: string }) {
  return renewLoan({ context: await actor(), ...input })
}

export async function placeHoldAction(input: { memberId: string; recordId?: string; itemId?: string; idempotencyKey: string }) {
  return placeHold({ context: await actor(), ...input })
}

