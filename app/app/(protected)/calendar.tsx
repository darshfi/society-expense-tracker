import { useState, useEffect, useCallback } from 'react'
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/ThemeContext'
import ScreenLayout from '../../components/ScreenLayout'

const SCREEN_WIDTH = Dimensions.get('window').width
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 56) / 7)

function getCurrentMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startWeekday = firstDay.getDay() // 0=Sun
  const numDays = lastDay.getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) days.push(null)
  for (let d = 1; d <= numDays; d++) days.push(d)
  return days
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long', year: 'numeric',
  })
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarScreen() {
  const router = useRouter()
  const { theme } = useTheme()
  const [year, setYear] = useState(() => getCurrentMonth().year)
  const [month, setMonth] = useState(() => getCurrentMonth().month)
  const [expenseDays, setExpenseDays] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayExpenses, setDayExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dayLoading, setDayLoading] = useState(false)

  const fetchMonthExpenses = useCallback(async () => {
    setLoading(true)
    const { start, end } = getMonthRange(year, month)
    const { data } = await supabase
      .from('expenses')
      .select('expense_date')
      .gte('expense_date', start)
      .lte('expense_date', end)

    const days = new Set<string>()
    if (data) {
      data.forEach((e) => days.add(e.expense_date))
    }
    setExpenseDays(days)
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchMonthExpenses()
    setSelectedDate(null)
    setDayExpenses([])
  }, [fetchMonthExpenses])

  const handleDayPress = async (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setDayLoading(true)

    const { data } = await supabase
      .from('expenses')
      .select('id, amount, paid_by, vendor, category_id, categories(name)')
      .eq('expense_date', dateStr)
      .order('amount', { ascending: false })

    if (data) {
      setDayExpenses(
        data.map((e: any) => ({
          id: e.id,
          amount: e.amount,
          paid_by: e.paid_by,
          vendor: e.vendor,
          category_name: (e.categories as { name: string })?.name ?? 'Unknown',
        }))
      )
    } else {
      setDayExpenses([])
    }
    setDayLoading(false)
  }

  const navigateMonth = (direction: 1 | -1) => {
    let newMonth = month + direction
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear += 1 }
    else if (newMonth < 1) { newMonth = 12; newYear -= 1 }
    setMonth(newMonth)
    setYear(newYear)
  }

  const days = getMonthDays(year, month)

  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

  return (
    <ScreenLayout>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Page title */}
        <View style={[styles.pageTitleBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Calendar</Text>
          <Pressable onPress={fetchMonthExpenses} style={styles.refreshButton}>
            <Text style={[styles.refreshIcon, { color: theme.accent }]}>↻</Text>
          </Pressable>
        </View>

        {/* Month navigation */}
        <View style={[styles.monthNav, { backgroundColor: theme.surface }]}>
          <Pressable style={[styles.navBtn, { backgroundColor: theme.accentLight }]} onPress={() => navigateMonth(-1)}>
            <Text style={[styles.navBtnText, { color: theme.accent }]}>‹</Text>
          </Pressable>
          <Text style={[styles.monthTitle, { color: theme.text }]}>{formatMonthLabel(year, month)}</Text>
          <Pressable style={[styles.navBtn, { backgroundColor: theme.accentLight }]} onPress={() => navigateMonth(1)}>
            <Text style={[styles.navBtnText, { color: theme.accent }]}>›</Text>
          </Pressable>
        </View>

        {/* Weekday headers */}
        <View style={[styles.calendarCard, { backgroundColor: theme.surface }]}>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={[styles.weekdayText, { color: theme.textMuted }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          {loading ? (
            <View style={styles.calendarLoading}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          ) : (
            <View style={styles.daysGrid}>
              {days.map((day, i) => {
                if (day === null) return <View key={`empty-${i}`} style={styles.dayCell} />
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasExpense = expenseDays.has(dateStr)
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === today

                return (
                  <Pressable
                    key={dateStr}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: theme.accentLight },
                    ]}
                    onPress={() => handleDayPress(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isToday ? theme.accent : theme.text },
                        isToday && { fontWeight: 'bold' },
                      ]}
                    >
                      {day}
                    </Text>
                    {hasExpense && (
                      <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                    )}
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>

        {/* Selected day expenses */}
        {selectedDate && (
          <View style={[styles.dayExpensesCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dayExpensesTitle, { color: theme.text }]}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </Text>

            {dayLoading ? (
              <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 12 }} />
            ) : dayExpenses.length === 0 ? (
              <Text style={[styles.noExpenses, { color: theme.textSecondary }]}>
                No expenses on this day.
              </Text>
            ) : (
              dayExpenses.map((exp) => (
                <Pressable
                  key={exp.id}
                  style={[styles.expenseRow, { borderBottomColor: theme.borderLight }]}
                  onPress={() => router.push(`/(protected)/expense-detail/${exp.id}`)}
                >
                  <View style={styles.expenseRowLeft}>
                    <Text style={[styles.expAmount, { color: theme.accent }]}>
                      ₹{exp.amount.toFixed(2)}
                    </Text>
                    <Text style={[styles.expPaidBy, { color: theme.textSecondary }]}>
                      {exp.paid_by}
                    </Text>
                  </View>
                  <Text style={[styles.expCategory, { color: theme.textMuted }]}>
                    {exp.category_name}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  )
}

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
  return { start, end }
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  pageTitleBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: 22, fontWeight: 'bold',
  },
  refreshButton: {
    padding: 6,
  },
  refreshIcon: {
    fontSize: 22, fontWeight: 'bold',
  },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 16, marginBottom: 8, padding: 12, borderRadius: 18,
  },
  navBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navBtnText: { fontSize: 24, fontWeight: 'bold', marginTop: -1 },
  monthTitle: { fontSize: 17, fontWeight: 'bold' },

  calendarCard: { marginHorizontal: 16, borderRadius: 18, padding: 12, paddingBottom: 8 },
  calendarLoading: { height: 200, justifyContent: 'center' },

  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayText: { width: DAY_SIZE, textAlign: 'center', fontSize: 12, fontWeight: '600' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: DAY_SIZE, height: DAY_SIZE - 4,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  dayText: { fontSize: 15 },
  dot: {
    position: 'absolute', bottom: 4,
    width: 5, height: 5, borderRadius: 3,
  },

  dayExpensesCard: { margin: 16, borderRadius: 18, padding: 16 },
  dayExpensesTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  noExpenses: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },

  expenseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  expenseRowLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  expAmount: { fontSize: 15, fontWeight: 'bold' },
  expPaidBy: { fontSize: 12 },
  expCategory: { fontSize: 13 },
})
