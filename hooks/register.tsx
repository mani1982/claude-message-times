import type { EngineInterface, Register } from 'claude-code'

// Times are kept in the plugin store under `t:<key>`, so a resumed session
// still shows them. Only the newest MAX_KEPT are kept.
const PREFIX = 't:'
const MAX_KEPT = 5000
const KEPT_CHARS = 23

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * A row's key: the first four groups of its uuid. The transcript draws a
 * message under its row uuid with the last group zeroed
 * (`dbde2a11-2e64-431d-a268-000000000000`), so both sides agree on these.
 */
export const keyOf = (id: string): string => PREFIX + id.slice(0, KEPT_CHARS)

const clock12 = (d: Date, withSeconds: boolean): string => {
  const h = d.getHours() % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = withSeconds ? `:${String(d.getSeconds()).padStart(2, '0')}` : ''
  return `${h}:${m}${s} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

/** `{ date: 'Tue, Nov 3', time: '1:44:07 PM' }`; the year joins the date outside this one. */
export const formatStamp = (at: number, now: number): { date: string; time: string } => {
  const d = new Date(at)
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : ` ${d.getFullYear()}`
  return {
    date: `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}${year}`,
    time: clock12(d, true),
  }
}

// Catppuccin Mocha palette.
const PEACH = '#fab387'
const GREEN = '#a6e3a1'
const BLUE = '#89b4fa'
const GREY = '#6c7086'

async function timeOf($: EngineInterface, id: string): Promise<number | undefined> {
  const at = await $.store.get(keyOf(id))
  return typeof at === 'number' ? at : undefined
}

async function record($: EngineInterface, uuid: string): Promise<void> {
  await $.store.set(keyOf(uuid), await $.clock.now())
}

/** Re-keys times 0.1.0 stored under a full uuid, drops debug keys, prunes. */
async function tidy($: EngineInterface): Promise<void> {
  for (const k of await $.store.keys()) {
    if (k.startsWith('dbg:')) {
      await $.store.delete(k)
    } else if (k.startsWith(PREFIX) && k.length > PREFIX.length + KEPT_CHARS) {
      const at = await $.store.get(k)
      await $.store.delete(k)
      if (typeof at === 'number') await $.store.set(keyOf(k.slice(PREFIX.length)), at)
    }
  }
  const keys = (await $.store.keys()).filter(k => k.startsWith(PREFIX))
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_KEPT))) await $.store.delete(k)
}

export const register: Register = on => {
  on('session.append', { door: 'prompt' }, async ($, e, next) => {
    if (!e.agentId && !e.message.isMeta) await record($, e.uuid)
    return next(e)
  })

  on('session.append', { door: 'response' }, async ($, e, next) => {
    if (!e.agentId) await record($, e.uuid)
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    await tidy($)
    return next(e)
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    // Only rows recorded from the `prompt` door have a time, so notices and
    // other parties' messages pass through untouched.
    const at = await timeOf($, e.requestId)
    if (at === undefined) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const { date, time } = formatStamp(at, await $.clock.now())
    const row = await next(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text color={PEACH}>◷ </Text>
          <Text color={GREEN}>{date}</Text>
          <Text color={GREY}> · </Text>
          <Text color={BLUE}>{time}</Text>
        </Box>
        {row}
      </Box>
    )
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!e.props.isFirstOfReply) return next(e)
    const at = await timeOf($, e.requestId)
    if (at === undefined) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const { date, time } = formatStamp(at, await $.clock.now())
    const row = await next(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text color={PEACH}>◷ </Text>
          <Text color={GREEN}>{date}</Text>
          <Text color={GREY}> · </Text>
          <Text color={BLUE}>{time}</Text>
        </Box>
        {row}
      </Box>
    )
  })
}
