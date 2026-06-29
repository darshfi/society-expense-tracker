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
import { Stack } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/ThemeContext'
import ScreenLayout from '../../components/ScreenLayout'

interface CategoryTotal {
  category_id: string
  category_name: string
  total: number
  color: string
}

const CATEGORY_COLORS = [
  '#2F4A3C', '#6FA988', '#C1502E', '#A67C52',
  '#4A6FA5', '#8B5CF6', '#D97706', '#059669',
  '#DC2626', '#7C3AED', '#0891B2', '#B45309',
  '#1D4ED8', '#BE123C', '#15803D',
]

const SCREEN_WIDTH = Dimensions.get('window').width

function getCurrentMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
  return { start, end }
}

function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function SummaryScreen() {
  const { theme } = useTheme()
  const [year, setYear] = useState(() => getCurrentMonth().year)
  const [month, setMonth] = useState(() => getCurrentMonth().month)
  const [monthTotal, setMonthTotal] = useState<number | null>(null)
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMonthData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { start, end } = getMonthRange(year, month)

    try {
      const { data: allCategories } = await supabase
        .from('categories')
        .select('id, name')

      const categoryColorMap: Record<string, string> = {}
      if (allCategories) {
        allCategories.forEach((cat, i) => {
          categoryColorMap[cat.id] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
        })
      }

      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount, category_id, categories(name)')
        .gte('expense_date', start)
        .lte('expense_date', end)

      if (expenseError) {
        setError('Could not load summary: ' + expenseError.message)
        return
      }

      if (!expenses || expenses.length === 0) {
        setMonthTotal(0)
        setCategoryTotals([])
        return
      }

      const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
      setMonthTotal(total)

      const byCategory: Record<string, { name: string; total: number; id: string }> = {}
      for (const e of expenses) {
        const catId = e.category_id
        const catName = ((e.categories as { name: string })?.name) ?? 'Unknown'
        if (!byCategory[catId]) {
          byCategory[catId] = { name: catName, total: 0, id: catId }
        }
        byCategory[catId].total += Number(e.amount)
      }

      const sorted = Object.values(byCategory)
        .sort((a, b) => b.total - a.total)
        .map((cat) => ({
          category_id: cat.id,
          category_name: cat.name,
          total: cat.total,
          color: categoryColorMap[cat.id] || '#999',
        }))

      setCategoryTotals(sorted)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError('An unexpected error occurred: ' + msg)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchMonthData()
  }, [fetchMonthData])

  const navigateMonth = (direction: 1 | -1) => {
    let newMonth = month + direction
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear += 1 }
    else if (newMonth < 1) { newMonth = 12; newYear -= 1 }
    setMonth(newMonth)
    setYear(newYear)
  }

  const isCurrentMonth = year === getCurrentMonth().year && month === getCurrentMonth().month
  const maxCategoryTotal = Math.max(...categoryTotals.map((c) => c.total), 1)
  const barMaxWidth = SCREEN_WIDTH - 130

  return (
    <ScreenLayout>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Page title */}
        <View style={[styles.pageTitleBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Summary</Text>
          <Pressable onPress={fetchMonthData} style={styles.refreshButton}>
            <Text style={[styles.refreshIcon, { color: theme.accent }]}>↻</Text>
          </Pressable>
        </View>

        {/* Month navigation */}
        <View style={[styles.monthNav, { backgroundColor: theme.surface }]}>
          <Pressable style={[styles.navButton, { backgroundColor: theme.accentLight }]} onPress={() => navigateMonth(-1)}>
            <Text style={[styles.navButtonText, { color: theme.accent }]}>‹</Text>
          </Pressable>
          <Text style={[styles.monthLabel, { color: theme.text }]}>
            {formatMonthLabel(year, month)}
          </Text>
          <Pressable
            style={[styles.navButton, isCurrentMonth && { backgroundColor: theme.borderLight, opacity: 0.4 }, { backgroundColor: theme.accentLight }]}
            onPress={() => !isCurrentMonth && navigateMonth(1)}
          >
            <Text style={[styles.navButtonText, { color: isCurrentMonth ? theme.textMuted : theme.accent }]}>›</Text>
          </Pressable>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.errorText, { color: theme.destructive }]}>{error}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: theme.accent }]} onPress={fetchMonthData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Empty state */}
        {!loading && !error && monthTotal === 0 && (
          <View style={[styles.emptyContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.emptyIcon]}>📊</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No expenses recorded for {formatMonthLabel(year, month)}
            </Text>
          </View>
        )}

        {/* Data */}
        {!loading && !error && monthTotal !== null && monthTotal > 0 && (
          <>
            {/* Total card */}
            <View style={[styles.totalCard, { backgroundColor: theme.accent }]}>
              <Text style={styles.totalLabel}>Total spend</Text>
              <Text style={styles.totalAmount}>₹{monthTotal.toFixed(2)}</Text>
              <Text style={styles.totalCaption}>
                {categoryTotals.length} categor{categoryTotals.length === 1 ? 'y' : 'ies'}
              </Text>
            </View>

            {/* Bar chart */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>By category</Text>
            <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
              {categoryTotals.map((cat) => {
                const barWidth = Math.max(
                  (cat.total / maxCategoryTotal) * barMaxWidth,
                  4
                )
                return (
                  <View key={cat.category_id} style={styles.chartRow}>
                    <View style={styles.chartLabel}>
                      <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.categoryName, { color: theme.textSecondary }]} numberOfLines={1}>
                        {cat.category_name}
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: theme.borderLight }]}>
                      <View style={[styles.barFill, { width: barWidth, backgroundColor: cat.color }]} />
                    </View>
                    <Text style={[styles.categoryAmount, { color: theme.text }]}>
                      ₹{cat.total.toFixed(0)}
                    </Text>
                  </View>
                )
              })}
            </View>

            {/* Category list */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Category breakdown</Text>
            <View style={[styles.listCard, { backgroundColor: theme.surface }]}>
              {categoryTotals.map((cat, idx) => (
                <View key={cat.category_id} style={[styles.listRow, { borderBottomColor: theme.borderLight }]}>
                  <View style={styles.listLeft}>
                    <Text style={[styles.rankNumber, { color: theme.textMuted }]}>#{idx + 1}</Text>
                    <View style={[styles.listColorDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.listCategoryName, { color: theme.text }]}>{cat.category_name}</Text>
                  </View>
                  <Text style={[styles.listAmount, { color: theme.accent }]}>₹{cat.total.toFixed(2)}</Text>
                </View>
              ))}
              <View style={[styles.listTotalRow, { borderTopColor: theme.accent }]}>
                <Text style={[styles.listTotalLabel, { color: theme.text }]}>Total</Text>
                <Text style={[styles.listTotalAmount, { color: theme.accent }]}>₹{monthTotal.toFixed(2)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 20 },

  pageTitleBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: -16, marginTop: -16, marginBottom: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  navButton: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  navButtonText: { fontSize: 28, fontWeight: 'bold', marginTop: -2 },
  monthLabel: { fontSize: 18, fontWeight: 'bold' },

  loadingContainer: { padding: 40, alignItems: 'center' },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, alignSelf: 'center' },
  retryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  emptyContainer: {
    borderRadius: 18, padding: 40, alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },

  totalCard: {
    borderRadius: 18, padding: 28, alignItems: 'center', marginBottom: 24,
  },
  totalLabel: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  totalAmount: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  totalCaption: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 4 },

  chartCard: { borderRadius: 18, padding: 16, marginBottom: 20 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chartLabel: { flexDirection: 'row', alignItems: 'center', width: 88, marginRight: 8 },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  categoryName: { fontSize: 12, flexShrink: 1 },
  barTrack: { flex: 1, height: 18, borderRadius: 9, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 9 },
  categoryAmount: { width: 58, fontSize: 13, fontWeight: '600', textAlign: 'right', marginLeft: 8 },

  listCard: { borderRadius: 18, padding: 16 },
  listRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  listLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rankNumber: { fontSize: 12, fontWeight: 'bold', width: 24 },
  listColorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  listCategoryName: { fontSize: 14 },
  listAmount: { fontSize: 14, fontWeight: 'bold' },
  listTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 2, marginTop: 4,
  },
  listTotalLabel: { fontSize: 15, fontWeight: 'bold' },
  listTotalAmount: { fontSize: 16, fontWeight: 'bold' },
})
