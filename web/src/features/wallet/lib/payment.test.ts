/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { describe, expect, test } from 'vitest'

import { PAYMENT_TYPES } from '../constants'
import {
  dispatchSelectedPayment,
  getDefaultPaymentType,
  getDefaultPaymentMethod,
  getMinTopupAmount,
  isStripePayment,
  isWaffoPayment,
  isWaffoPancakePayment,
  isEpusdtPayment,
} from './payment'

describe('payment type classification', () => {
  test('keeps Waffo and Waffo Pancake on their dedicated flows', () => {
    expect(isWaffoPayment(PAYMENT_TYPES.WAFFO)).toBe(true)
    expect(isWaffoPayment(PAYMENT_TYPES.WAFFO_PANCAKE)).toBe(false)
    expect(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO_PANCAKE)).toBe(true)
    expect(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO)).toBe(false)
    expect(isStripePayment(PAYMENT_TYPES.STRIPE)).toBe(true)
  })

  test('keeps Epusdt on its dedicated flow', () => {
    expect(isEpusdtPayment(PAYMENT_TYPES.EPUSDT)).toBe(true)
    expect(isEpusdtPayment('alipay')).toBe(false)
    expect(isEpusdtPayment(PAYMENT_TYPES.WAFFO)).toBe(false)
  })
})

describe('payment dispatch', () => {
  test('keeps the selected Waffo method index through confirmation', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      3,
      {
        regular: async () => {
          calls.push('regular')
          return false
        },
        waffo: async (amount, index) => {
          calls.push(`waffo:${amount}:${index}`)
          return true
        },
        waffoPancake: async () => {
          calls.push('pancake')
          return false
        },
        epusdt: async () => {
          calls.push('epusdt')
          return false
        },
      }
    )

    expect(success).toBe(true)
    expect(calls).toEqual(['waffo:120:3'])
  })

  test('does not create a Waffo order without a selected method index', async () => {
    let called = false
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      null,
      {
        regular: async () => false,
        waffo: async () => {
          called = true
          return true
        },
        waffoPancake: async () => false,
        epusdt: async () => false,
      }
    )

    expect(success).toBe(false)
    expect(called).toBe(false)
  })

  test('routes Epusdt confirmation to the dedicated processor', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'USDT', type: PAYMENT_TYPES.EPUSDT },
      50,
      null,
      {
        regular: async () => {
          calls.push('regular')
          return false
        },
        waffo: async () => {
          calls.push('waffo')
          return false
        },
        waffoPancake: async () => {
          calls.push('pancake')
          return false
        },
        epusdt: async (amount) => {
          calls.push(`epusdt:${amount}`)
          return true
        },
      }
    )

    expect(success).toBe(true)
    expect(calls).toEqual(['epusdt:50'])
  })
})

describe('topup info resolution', () => {
  test('uses the Epusdt minimum when only Epusdt topup is enabled', () => {
    const topupInfo = {
      enable_online_topup: false,
      enable_epusdt_topup: true,
      epusdt_min_topup: 5,
      min_topup: 1,
      stripe_min_topup: 1,
    } as never

    expect(getMinTopupAmount(topupInfo)).toBe(5)
    expect(getDefaultPaymentType(topupInfo)).toBe(PAYMENT_TYPES.EPUSDT)
  })

  test('falls back to the default minimum when the Epusdt minimum is absent', () => {
    const topupInfo = {
      enable_online_topup: false,
      enable_epusdt_topup: true,
      min_topup: 1,
      stripe_min_topup: 1,
    } as never

    expect(getMinTopupAmount(topupInfo)).toBe(1)
  })

  test('reuses the matching pay_method for the default payment method', () => {
    const topupInfo = {
      enable_online_topup: true,
      enable_epusdt_topup: true,
      min_topup: 1,
      stripe_min_topup: 1,
      pay_methods: [
        { name: 'USDT', type: PAYMENT_TYPES.EPUSDT },
        { name: 'Alipay', type: PAYMENT_TYPES.ALIPAY },
      ],
    } as never

    expect(getDefaultPaymentMethod(topupInfo)).toEqual({
      name: 'USDT',
      type: PAYMENT_TYPES.EPUSDT,
    })
  })

  test('builds a minimal default payment method when not in pay_methods', () => {
    const topupInfo = {
      enable_online_topup: false,
      enable_epusdt_topup: true,
      min_topup: 1,
      stripe_min_topup: 1,
    } as never

    expect(getDefaultPaymentMethod(topupInfo)).toEqual({
      name: PAYMENT_TYPES.EPUSDT,
      type: PAYMENT_TYPES.EPUSDT,
    })
  })
})
