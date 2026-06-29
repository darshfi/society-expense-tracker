import { useState, useEffect, useCallback } from 'react'
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Dimensions,
} from 'react-native'
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../lib/ThemeContext'
import ScreenLayout from '../../../components/ScreenLayout'

interface ExpenseDetail {
  id: string
  expense_date: string
  amount: number
  vendor: string | null
  paid_by: string
  notes: string | null
  category_name: string
}

interface BillFile {
  id: string
  file_name: string
  storage_path: string
  signedUrl: string | null
  isImage: boolean
}

const SCREEN_WIDTH = Dimensions.get('window').width

export default function ExpenseDetailScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>()
  const { theme } = useTheme()
  const router = useRouter()

  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [billFiles, setBillFiles] = useState<BillFile[]>([])
  const [loading, setLoading] = useState(true)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Re-fetch data every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (expenseId) {
        fetchExpenseDetail()
      }
    }, [expenseId])
  )

  const fetchExpenseDetail = async () => {
    setLoading(true)
    try {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('id, expense_date, amount, vendor, paid_by, notes, categories(name)')
        .eq('id', expenseId)
        .single()

      if (expenseError) {
        Alert.alert('Error', 'Could not load expense: ' + expenseError.message)
        return
      }

      setExpense({
        id: expenseData.id,
        expense_date: expenseData.expense_date,
        amount: expenseData.amount,
        vendor: expenseData.vendor,
        paid_by: expenseData.paid_by,
        notes: expenseData.notes,
        category_name: ((expenseData.categories as unknown as { name: string })?.name) ?? 'Unknown',
      })

      const { data: filesData } = await supabase
        .from('bill_files')
        .select('id, file_name, storage_path')
        .eq('expense_id', expenseId)

      const files = (filesData || []).map((f) => ({
        ...f,
        signedUrl: null as string | null,
        isImage: isImageFile(f.file_name),
      }))

      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          try {
            const { data } = await supabase.storage
              .from('bills')
              .createSignedUrl(file.storage_path, 3600)
            return { ...file, signedUrl: data?.signedUrl ?? null }
          } catch {
            return file
          }
        })
      )

      setBillFiles(filesWithUrls)
    } catch (err) {
      console.error('[detail] Unexpected error:', err)
      Alert.alert('Error', 'An unexpected error occurred while loading the expense.')
    } finally {
      setLoading(false)
    }
  }

  const isImageFile = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')
  }

  const handleOpenFile = async (file: BillFile) => {
    const url = file.signedUrl
    if (!url) {
      Alert.alert('Error', 'Could not generate a link for this file.')
      return
    }
    if (file.isImage) {
      setFullScreenImage(url)
    } else {
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
      } else {
        Alert.alert('Error', 'Could not open this file on this device.')
      }
    }
  }

  const handleEdit = () => {
    router.push({ pathname: '/(protected)/add-expense', params: { editId: expenseId } })
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const { data: files } = await supabase
        .from('bill_files')
        .select('id, storage_path')
        .eq('expense_id', expenseId)

      if (files && files.length > 0) {
        const storagePaths = files.map((f) => f.storage_path).filter(Boolean)
        if (storagePaths.length > 0) {
          await supabase.storage.from('bills').remove(storagePaths)
        }
        await supabase.from('bill_files').delete().eq('expense_id', expenseId)
      }

      const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (expenseError) {
        Alert.alert('Error', 'Could not delete expense: ' + expenseError.message)
        return
      }

      router.replace('/(protected)')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      Alert.alert('Error', 'An unexpected error occurred: ' + msg)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <ScreenLayout>
        <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading expense…</Text>
        </View>
      </ScreenLayout>
    )
  }

  if (!expense) {
    return (
      <ScreenLayout>
        <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
          <Text style={[styles.errorText, { color: theme.destructive }]}>Expense not found.</Text>
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={[styles.headerBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Text style={[styles.headerBackText, { color: theme.textSecondary }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Expense details</Text>
        <Pressable style={styles.headerEdit} onPress={handleEdit}>
          <Text style={[styles.headerEditText, { color: theme.accent }]}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.contentContainer}>
        {/* Amount + category */}
        <View style={[styles.headerCard, { backgroundColor: theme.accent }]}>
          <Text style={styles.amount}>₹{expense.amount.toFixed(2)}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{expense.category_name}</Text>
          </View>
        </View>

        {/* Detail fields */}
        <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
          <DetailRow label="Date" value={formatDate(expense.expense_date)} theme={theme} />
          <DetailRow label="Paid by" value={expense.paid_by} theme={theme} />
          {expense.vendor ? (
            <DetailRow label="Vendor" value={expense.vendor} theme={theme} />
          ) : null}
          {expense.notes ? (
            <View style={[styles.notesSection, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesText, { color: theme.text }]}>{expense.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Attachments */}
        {billFiles.length > 0 && (
          <View style={styles.filesSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Attachments ({billFiles.length})
            </Text>
            <View style={styles.filesGrid}>
              {billFiles.map((file) => (
                <Pressable
                  key={file.id}
                  style={[styles.fileCard, { backgroundColor: theme.surface }]}
                  onPress={() => handleOpenFile(file)}
                >
                  {file.signedUrl && file.isImage ? (
                    <Image source={{ uri: file.signedUrl }} style={styles.fileThumbnail} resizeMode="cover" />
                  ) : (
                    <View style={[styles.pdfPreview, { backgroundColor: theme.destructiveLight }]}>
                      <Text style={styles.pdfIcon}>📄</Text>
                    </View>
                  )}
                  <Text style={[styles.fileName, { color: theme.textSecondary }]} numberOfLines={2}>
                    {file.file_name}
                  </Text>
                  {!file.isImage && (
                    <Text style={[styles.tapToOpen, { color: theme.accent }]}>Tap to open PDF</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {billFiles.length === 0 && !loading && (
          <View style={[styles.noFilesSection, { backgroundColor: theme.surface }]}>
            <Text style={[styles.noFilesText, { color: theme.textMuted }]}>
              No bill attachments for this expense.
            </Text>
          </View>
        )}

        {/* Delete section */}
        <View style={styles.deleteSection}>
          <Pressable
            style={[styles.deleteButton, { borderColor: theme.destructive }, deleting && { opacity: 0.6 }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <View style={styles.deletingRow}>
                <ActivityIndicator size="small" color={theme.destructive} />
                <Text style={[styles.deleteButtonText, { color: theme.destructive }]}>  Deleting…</Text>
              </View>
            ) : (
              <Text style={[styles.deleteButtonText, { color: theme.destructive }]}>Delete expense</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Full-screen image modal */}
      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <Pressable style={styles.fsOverlay} onPress={() => setFullScreenImage(null)}>
          {fullScreenImage && (
            <Image source={{ uri: fullScreenImage }} style={styles.fsImage} resizeMode="contain" />
          )}
          <Pressable style={styles.fsClose} onPress={() => setFullScreenImage(null)}>
            <Text style={styles.fsCloseText}>✕</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setShowDeleteConfirm(false)}>
          <Pressable style={[styles.confirmDialog, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>Delete expense</Text>
            <Text style={[styles.confirmMessage, { color: theme.textSecondary }]}>
              Are you sure you want to delete this expense? This cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable style={[styles.confirmCancel, { backgroundColor: theme.borderLight }]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={[styles.confirmCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmDeleteBtn, { backgroundColor: theme.destructive }, deleting && { opacity: 0.6 }]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenLayout>
  )
}

function DetailRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerBack: { paddingVertical: 4, paddingRight: 12 },
  headerBackText: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  headerEdit: { paddingVertical: 4, paddingLeft: 12 },
  headerEditText: { fontSize: 16, fontWeight: '600' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 15 },
  errorText: { fontSize: 16 },

  // Header card (amount + category)
  headerCard: {
    borderRadius: 18, padding: 28, alignItems: 'center', marginBottom: 12,
  },
  amount: { fontSize: 40, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Detail card
  detailCard: { borderRadius: 18, padding: 16, marginBottom: 12 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  detailValue: { fontSize: 14, flex: 2, textAlign: 'right' },
  notesSection: { paddingVertical: 12, borderBottomWidth: 1 },
  notesText: { fontSize: 14, lineHeight: 20, marginTop: 6 },

  // Files
  filesSection: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  filesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fileCard: {
    width: (SCREEN_WIDTH - 44) / 2, borderRadius: 14, overflow: 'hidden',
  },
  fileThumbnail: { width: '100%', height: 130, backgroundColor: '#eee' },
  pdfPreview: { width: '100%', height: 130, justifyContent: 'center', alignItems: 'center' },
  pdfIcon: { fontSize: 40 },
  fileName: { fontSize: 12, padding: 8, paddingBottom: 4 },
  tapToOpen: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingBottom: 8 },
  noFilesSection: { padding: 30, borderRadius: 18, alignItems: 'center' },
  noFilesText: { fontSize: 14, fontStyle: 'italic' },

  // Delete
  deleteSection: { marginTop: 20, marginBottom: 20 },
  deleteButton: {
    padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1.5,
  },
  deleteButtonText: { fontSize: 16, fontWeight: '600' },
  deletingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  // Full-screen image modal
  fsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fsImage: { width: SCREEN_WIDTH, height: '80%' },
  fsClose: {
    position: 'absolute', top: 50, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  fsCloseText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  // Delete confirmation modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmDialog: {
    borderRadius: 18, padding: 24, width: '100%', maxWidth: 340,
  },
  confirmTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  confirmMessage: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  confirmButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  confirmCancel: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  confirmCancelText: { fontSize: 15, fontWeight: '600' },
  confirmDeleteBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  confirmDeleteText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
})
