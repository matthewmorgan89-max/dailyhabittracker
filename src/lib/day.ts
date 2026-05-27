import { format, getDayOfYear } from 'date-fns'

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

export function getDayInfo(date: Date = new Date()): DayInfo {
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

export function getPrincipleOfDay(date: Date = new Date()) {
  const idx = getDayOfYear(date) % PRINCIPLES.length
  return PRINCIPLES[idx]
}
