import { format, getDayOfYear } from 'date-fns'

/**
 * Returns the current date as a Date object anchored to midnight,
 * using the wall-clock date in the given timezone (defaults to Sydney).
 * Fixes server-side UTC vs local timezone mismatch on Vercel.
 */
export function getLocalDate(tz = 'Australia/Sydney'): Date {
  // en-CA locale gives YYYY-MM-DD format reliably
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
  return new Date(dateStr + 'T00:00:00')
}

export const RELATIONSHIP_PROMPTS = [
  { label: 'Tell someone specifically what they mean to you', why: "Not just 'love you' — say exactly why. Specificity is what lands." },
  { label: 'Call or message someone you haven\'t spoken to in a month', why: 'Relationships atrophy without investment. One touch keeps the thread alive.' },
  { label: 'Check in on a friend who might be going through something', why: 'Being the person who shows up when it\'s hard is rarer than it should be.' },
  { label: 'Do one unexpected thing for your partner today', why: 'Something they didn\'t ask for. Unrequested acts say more than requests fulfilled.' },
  { label: 'Have a real conversation — no phones, no agenda', why: 'Undivided attention is increasingly rare. It\'s one of the best things you can give.' },
  { label: 'Send a voice note to someone who matters to you', why: 'Voice carries warmth that text can\'t. 60 seconds, lands differently.' },
  { label: 'Make a concrete plan to see someone face-to-face', why: '"We should catch up" means nothing. A date in the calendar means everything.' },
  { label: 'Call your sister', why: 'Family connections drift without maintenance. Don\'t let them.' },
  { label: 'Reconnect with an old friend you\'ve been meaning to reach out to', why: 'Every week you delay makes it feel harder. The discomfort is yours, not theirs.' },
  { label: 'Express specific gratitude to someone who\'s been in your corner', why: 'People who support you deserve to hear it. Most of them never will.' },
  { label: 'Introduce two people who should know each other', why: 'Connectors compound. Every introduction builds your network twice.' },
  { label: 'Put your phone away for every conversation today', why: 'Partial attention is a subtle insult. Full presence is a rare gift.' },
  { label: 'Ask someone about their life — not their work, their actual life', why: 'Most conversations are logistics. Being the person who goes deeper is memorable.' },
  { label: 'Share a meal or coffee with someone who energises you', why: 'You\'re an extrovert. Time with the right people is fuel, not distraction.' },
]

export function getRelationshipPromptOfDay(date: Date = getLocalDate()) {
  const idx = getDayOfYear(date) % RELATIONSHIP_PROMPTS.length
  return RELATIONSHIP_PROMPTS[idx]
}

export type DayType = 'office' | 'wfh' | 'saturday' | 'rest'

export interface DayInfo {
  type: DayType
  label: string
  dateStr: string       // YYYY-MM-DD for DB queries
  displayDate: string   // e.g. "Tuesday, 27 May"
  isWorkday: boolean    // has day job
  isVouchDay: boolean   // do Vouch habits
  showLunchExercise: boolean
}

export function getDayInfo(date: Date = getLocalDate()): DayInfo {
  const dow = date.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  let type: DayType
  if (dow === 0) type = 'rest'
  else if (dow >= 2 && dow <= 4) type = 'office'
  else if (dow === 6) type = 'saturday'
  else type = 'wfh'

  const labels: Record<DayType, string> = {
    office: 'Office Day',
    wfh: 'Work From Home',
    saturday: 'Saturday',
    rest: 'Rest Day',
  }

  return {
    type,
    label: labels[type],
    dateStr: format(date, 'yyyy-MM-dd'),
    displayDate: format(date, 'EEEE, d MMMM'),
    isWorkday: dow >= 1 && dow <= 5,
    isVouchDay: dow !== 0,
    showLunchExercise: type === 'office',
  }
}

export const FROG_QUOTE = {
  text: "If it's your job to eat a frog, it's best to do it first thing in the morning.",
  source: 'Mark Twain',
}

const PRINCIPLES = [
  { text: 'Action starts emotion. You don\'t wait to feel ready — you act, and then you feel ready.', source: 'Naval Ravikant' },
  { text: 'Eat the frog first. Whatever you\'re most avoiding is the thing that most needs doing.', source: 'Brian Tracy' },
  { text: 'You are not your mood. You are your commitments.', source: 'Ryan Holiday' },
  { text: 'The 2% rule: most people know what to do. Almost nobody does it. That gap is your advantage.', source: 'Brian Tracy' },
  { text: 'Sleep is not rest from the work. Sleep is the work. It funds every other discipline.', source: 'Matthew Walker' },
  { text: 'The obstacle is the training. There is no other training.', source: 'Ryan Holiday' },
  { text: 'Focus × Stoicism × Time × Diversification = Wealth. Remove any variable and the equation breaks.', source: 'Scott Galloway' },
  { text: 'Shallow work expands to fill the time you give it. Guard the deep work block or lose it.', source: 'Cal Newport' },
  { text: 'You are not the person who thinks about doing great things. You are the person who does them.', source: 'David Goggins' },
  { text: 'When you think you\'re done, you\'re at 40%. That\'s where most people stop. Don\'t stop there.', source: 'David Goggins' },
  { text: 'The quality of your life is determined by the quality of your habits, not your intentions.', source: 'James Clear' },
  { text: 'Identity before outcome. Every habit is a vote for the person you are becoming.', source: 'James Clear' },
  { text: 'Never miss twice. One missed day is an accident. Two is the start of a new habit.', source: 'James Clear' },
  { text: 'Relationships compound the same way interest does. Small deposits every day.', source: 'Scott Galloway' },
  { text: 'Outreach is the work. Everything else is preparation for the work.', source: 'The Work' },
  { text: 'You don\'t control outcomes. You control inputs. Be obsessive about the inputs.', source: 'Marcus Aurelius' },
  { text: 'Full responsibility, no excuses. Every outcome you have is yours to own.', source: 'Brian Tracy' },
  { text: 'The goal is not to be better than other people. The goal is to be better than you were yesterday.', source: 'Wayne Dyer' },
  { text: 'Read for 30 minutes in your field every day. Most people won\'t. That\'s the entire edge.', source: 'Brian Tracy' },
  { text: 'Energy management is more important than time management. Sleep, exercise, and food are inputs, not luxuries.', source: 'Brian Tracy' },
  { text: 'Presence is the gift. The phone is the thief.', source: 'The Work' },
  { text: 'The morning is your moat. No one is in your way yet. Use it.', source: 'The Work' },
  { text: 'Progress requires discomfort. Comfort requires stagnation. You can\'t have both.', source: 'David Goggins' },
  { text: 'Written goals are contracts with yourself. Unwritten goals are just wishes.', source: 'Brian Tracy' },
  { text: 'People who do not give you energy are costing you energy. Choose your environment.', source: 'Scott Galloway' },
  { text: 'Say no to almost everything so you can say yes to the things that compound.', source: 'Naval Ravikant' },
  { text: 'The founder who does the outreach wins. Not the one with the best deck.', source: 'The Work' },
  { text: 'Extroverts recharge around people. Isolation is not discipline — it\'s a performance drain.', source: 'The Work' },
  { text: 'Time is the one resource you cannot earn back. Track it. Eliminate what doesn\'t compound.', source: 'Brian Tracy' },
  { text: 'Stoicism is not about suppressing emotion. It\'s about not being controlled by it.', source: 'Ryan Holiday' },
]

export function getPrincipleOfDay(date: Date = getLocalDate()) {
  const idx = getDayOfYear(date) % PRINCIPLES.length
  return PRINCIPLES[idx]
}
