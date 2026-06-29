import { Text, View, FlatList, StyleSheet, Pressable } from 'react-native'
import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useFocusEffect } from 'expo-router'
import { useTheme } from '../../lib/ThemeContext'
import ScreenLayout from '../../components/ScreenLayout'

interface Expense {
  id: string
  expense_date: string
  category_id: string
  category_name: string
  amount: number
  vendor: string | null
  paid_by: string
  notes: string | null
}

type GroupedExpenses = Record<string, Expense[]>

export default function ExpenseListScreen() {
  const router = useRouter()
  const { theme } = useTheme()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      fetchExpenses()
    }, [])
  )

  const fetchExpenses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('id, expense_date, amount, vendor, paid_by, notes, category_id, categories(name)')
      .order('expense_date', { ascending: false })

    if (error) {
      alert('Error fetching expenses: ' + error.message)
    } else if (data) {
      const mapped = data.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        expense_date: item.expense_date as string,
        amount: item.amount as number,
        vendor: item.vendor as string | null,
        paid_by: item.paid_by as string,
        notes: item.notes as string | null,
        category_id: item.category_id as string,
        category_name: (item.categories as { name: string })?.name ?? 'Unknown',
      }))
      setExpenses(mapped)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <ScreenLayout>
        <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading expenses...</Text>
        </View>
      </ScreenLayout>
    )
  }

  if (expenses.length === 0) {
    return (
      <ScreenLayout>
        <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No expenses yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Tap the + button below to add your first expense.
          </Text>
        </View>
      </ScreenLayout>
    )
  }

  const grouped: GroupedExpenses = expenses.reduce((acc, expense) => {
    const date = expense.expense_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(expense)
    return acc
  }, {} as GroupedExpenses)

  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <ScreenLayout>
      <View style={[styles.listContainer, { backgroundColor: theme.bg }]}>
        {/* Page title */}
        <View style={[styles.pageTitleBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Expenses</Text>
          <Pressable onPress={fetchExpenses} style={styles.refreshButton}>
            <Text style={[styles.refreshIcon, { color: theme.accent }]}>↻</Text>
          </Pressable>
        </View>
        <FlatList
          data={dates}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: date }) => (
            <View style={[styles.dateSection, { backgroundColor: theme.surface }]}>
              <Text style={[styles.dateHeader, { color: theme.textSecondary }]}>
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {grouped[date].map((expense) => (
                <Pressable
                  key={expense.id}
                  style={[styles.expenseCard, { borderBottomColor: theme.borderLight }]}
                  onPress={() => router.push(`/(protected)/expense-detail/${expense.id}`)}
                >
                  <View style={styles.expenseLeft}>
                    <Text style={[styles.amount, { color: theme.accent }]}>
                      ₹{expense.amount.toFixed(2)}
                    </Text>
                    <Text style={[styles.paidBy, { color: theme.textMuted }]}>
                      {expense.paid_by}
                    </Text>
                  </View>
                  <View style={styles.expenseRight}>
                    <View style={[styles.categoryBadge, { backgroundColor: theme.accentLight }]}>
                      <Text style={[styles.categoryBadgeText, { color: theme.accent }]}>
                        {expense.category_name}
                      </Text>
                    </View>
                    {expense.vendor ? (
                      <Text style={[styles.vendor, { color: theme.textMuted }]}>
                        {expense.vendor}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    flex: 1,
  },
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
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  dateSection: {
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
  },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  paidBy: {
    fontSize: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vendor: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 3,
  },
})
