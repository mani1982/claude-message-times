import { expect, test } from 'claude-code/testing'

import { formatStamp } from './register'

const AT = new Date(2026, 10, 3, 13, 44, 7).getTime()

const USER = {
  plugin: 'message-times',
  component: 'UserMessage',
  requestId: 'dbde2a11-2e64-431d-a268-000000000000',
  props: { text: 'thanks it works', origin: { kind: 'composer' }, isExpanded: true },
} as const

const REPLY = {
  plugin: 'message-times',
  component: 'AssistantMessage',
  requestId: '66eea977-01c1-4cc7-9618-000000000000',
  props: { text: 'Good to hear.', isFirstOfReply: true },
} as const

test('stamps carry the weekday and date, the year only outside this one', () => {
  expect(formatStamp(AT, AT + 60_000)).toEqual({ date: 'Tue, Nov 3', time: '1:44:07 PM' })
  expect(formatStamp(new Date(2026, 10, 3, 0, 5).getTime(), AT).time).toBe('12:05:00 AM')
  expect(formatStamp(new Date(2025, 11, 31, 23, 59, 1).getTime(), AT)).toEqual({
    date: 'Wed, Dec 31 2025',
    time: '11:59:01 PM',
  })
})

test('a prompt and reply drawn under the zeroed-tail id are stamped; others pass through', async ($, on) => {
  const store = new Map<string, unknown>()
  on('store.set', (_, e) => (store.set(e.key, e.value), { value: undefined }))
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('clock.now', () => ({ value: AT }))
  on('session.append', (_, e, next) => next(e))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.append({
    uuid: 'dbde2a11-2e64-431d-a268-92b886ac7e6e',
    door: 'prompt',
    origin: { kind: 'composer' },
    message: { type: 'user', role: 'user', content: [{ type: 'text', text: 'hi' }] },
  })
  await $.session.append({
    uuid: '66eea977-01c1-4cc7-9618-4ca9fe98e190',
    door: 'response',
    origin: { kind: 'model', model: 'm' },
    message: { type: 'assistant', role: 'assistant', content: [{ type: 'text', text: 'yo' }] },
  })
  expect(store.get('t:dbde2a11-2e64-431d-a268')).toBe(AT)

  for (const surface of ['terminal', 'desktop'] as const) {
    for (const site of [USER, REPLY]) {
      const ui = await $.ui.mount({ ...site, surface })
      expect((await ui.find({ type: 'Text', text: /PM/ }))?.text).toBe('1:44:07 PM')
      expect((await ui.find({ type: 'Text', text: /Nov/ }))?.text).toBe('Tue, Nov 3')
      expect(await ui.find({ type: 'Text', text: /engine/ })).toBeDefined()
      await ui.unmount()
    }

    const later = await $.ui.mount({
      ...REPLY,
      surface,
      props: { ...REPLY.props, isFirstOfReply: false },
    })
    expect(await later.find({ type: 'Text', text: /PM/ })).toBeUndefined()
    await later.unmount()

    const unknown = await $.ui.mount({ ...USER, surface, requestId: '11111111-2222-3333-4444-000000000000' })
    expect(await unknown.find({ type: 'Text', text: /PM/ })).toBeUndefined()
    await unknown.unmount()
  }
})
