import { useState, useEffect } from 'react'
import {
  Text,
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { useRouter, Stack, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { useTheme } from '../../lib/ThemeContext'
import ScreenLayout from '../../components/ScreenLayout'

interface Category {
  id: string
  name: string
}

interface SelectedFile {
  uri: string
  name: string
  mimeType: string
  isImage: boolean
  nativeFile?: File
}

interface ExistingBillFile {
  id: string
  file_name: string
  storage_path: string
  isImage: boolean
}

const isImageFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')
}

export default function AddExpenseScreen() {
  const router = useRouter()
  const { editId } = useLocalSearchParams<{ editId?: string }>()
  const isEditMode = !!editId
  const { theme } = useTheme()

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [existingFiles, setExistingFiles] = useState<ExistingBillFile[]>([])
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([])
  const [initialLoading, setInitialLoading] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
    getCurrentUser()
    if (editId) {
      fetchExpenseForEdit(editId)
    }
  }, [editId])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')
    if (error) {
      Alert.alert('Error', 'Could not load categories: ' + error.message)
    } else {
      setCategories(data || [])
    }
  }

  const fetchExpenseForEdit = async (id: string) => {
    setInitialLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, expense_date, amount, vendor, paid_by, notes, category_id')
        .eq('id', id)
        .single()

      if (error) {
        Alert.alert('Error', 'Could not load expense: ' + error.message)
        router.back()
        return
      }

      setDate(data.expense_date)
      setAmount(String(data.amount))
      setVendor(data.vendor ?? '')
      setPaidBy(data.paid_by)
      setSelectedCategoryId(data.category_id)
      setNotes(data.notes ?? '')

      const { data: files } = await supabase
        .from('bill_files')
        .select('id, file_name, storage_path')
        .eq('expense_id', id)

      if (files) {
        setExistingFiles(files.map((f) => ({ ...f, isImage: isImageFile(f.file_name) })))
      }
    } catch (err) {
      console.error('[edit] Fetch error:', err)
      Alert.alert('Error', 'An unexpected error occurred while loading the expense.')
      router.back()
    } finally {
      setInitialLoading(false)
    }
  }

  const selectedCategoryName = categories.find((c) => c.id === selectedCategoryId)?.name ?? ''

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategoryId(cat.id)
    setShowCategoryPicker(false)
  }

  const handleAddNewCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      Alert.alert('Missing name', 'Enter a name for the new category.')
      return
    }
    const { data, error } = await supabase
      .from('categories')
      .insert({ name })
      .select('id, name')
      .single()

    if (error) {
      Alert.alert('Error', 'Could not create category: ' + error.message)
      return
    }
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedCategoryId(data.id)
    setNewCategoryName('')
    setShowNewCategoryInput(false)
    setShowCategoryPicker(false)
  }

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!result.canceled && result.assets) {
      setSelectedFiles((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName ?? `photo_${Date.now()}.jpg`,
          mimeType: a.mimeType ?? 'image/jpeg',
          isImage: true,
          nativeFile: (a as unknown as { file?: File }).file,
        })),
      ])
    }
  }

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to take a photo.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled && result.assets) {
      setSelectedFiles((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName ?? `photo_${Date.now()}.jpg`,
          mimeType: a.mimeType ?? 'image/jpeg',
          isImage: true,
          nativeFile: (a as unknown as { file?: File }).file,
        })),
      ])
    }
  }

  const pickPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
    })
    if (!result.canceled && result.assets) {
      setSelectedFiles((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          name: a.name,
          mimeType: a.mimeType ?? 'application/pdf',
          isImage: false,
          nativeFile: (a as unknown as { file?: File }).file,
        })),
      ])
    }
  }

  const removeNewFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingFile = (fileId: string) => {
    setRemovedFileIds((prev) => [...prev, fileId])
  }

  const readFileAsBytes = async (uri: string): Promise<Uint8Array> => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  const handleSave = async () => {
    if (!date) {
      Alert.alert('Missing date', 'Please enter the expense date.')
      return
    }
    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.')
      return
    }
    if (!selectedCategoryId) {
      Alert.alert('Missing category', 'Please select a category.')
      return
    }
    if (!paidBy.trim()) {
      Alert.alert('Missing payer', 'Please enter who paid for this expense.')
      return
    }
    if (!userId) {
      Alert.alert('Not authenticated', 'You must be logged in to add an expense.')
      return
    }

    setSaving(true)
    try {
      if (isEditMode && editId) {
        const { error: updateError } = await supabase
          .from('expenses')
          .update({
            expense_date: date,
            amount: parsedAmount,
            category_id: selectedCategoryId,
            vendor: vendor.trim() || null,
            paid_by: paidBy.trim(),
            notes: notes.trim() || null,
          })
          .eq('id', editId)

        if (updateError) {
          Alert.alert('Error', 'Could not update expense: ' + updateError.message)
          return
        }

        const uploadErrors: string[] = []
        for (const file of selectedFiles) {
          try {
            const fileBody: File | Uint8Array = file.nativeFile
              ? file.nativeFile
              : await readFileAsBytes(file.uri)
            const fileExt = file.name.split('.').pop() ?? 'bin'
            const storagePath = `${userId}/${editId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`

            const { error: uploadError } = await supabase.storage
              .from('bills')
              .upload(storagePath, fileBody, { contentType: file.mimeType })

            if (uploadError) {
              uploadErrors.push(`${file.name}: Storage upload failed — ${uploadError.message}`)
              continue
            }

            const { error: billFileError } = await supabase
              .from('bill_files')
              .insert({ expense_id: editId, storage_path: storagePath, file_name: file.name, uploaded_by: userId })

            if (billFileError) {
              uploadErrors.push(`${file.name}: Database insert failed — ${billFileError.message}`)
            }
          } catch (err) {
            uploadErrors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`)
          }
        }

        const deleteErrors: string[] = []
        for (const fileId of removedFileIds) {
          const fileInfo = existingFiles.find((f) => f.id === fileId)
          if (!fileInfo) continue
          try {
            await supabase.storage.from('bills').remove([fileInfo.storage_path])
            await supabase.from('bill_files').delete().eq('id', fileId)
          } catch (err) {
            deleteErrors.push(`${fileInfo.file_name}: ${err instanceof Error ? err.message : String(err)}`)
          }
        }

        const allErrors = [...uploadErrors, ...deleteErrors]
        if (allErrors.length > 0) {
          Alert.alert('Issues', allErrors.join('\n\n'))
        }

        // Go back to detail screen (it will re-fetch via useFocusEffect)
        router.back()
      } else {
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            expense_date: date,
            amount: parsedAmount,
            category_id: selectedCategoryId,
            vendor: vendor.trim() || null,
            paid_by: paidBy.trim(),
            notes: notes.trim() || null,
            created_by: userId,
          })
          .select()
          .single()

        if (expenseError) {
          Alert.alert('Error', 'Could not save expense: ' + expenseError.message)
          return
        }

        const expenseId = expense.id
        const uploadErrors: string[] = []
        for (const file of selectedFiles) {
          try {
            const fileBody: File | Uint8Array = file.nativeFile
              ? file.nativeFile
              : await readFileAsBytes(file.uri)
            const fileExt = file.name.split('.').pop() ?? 'bin'
            const storagePath = `${userId}/${expenseId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`

            const { error: uploadError } = await supabase.storage
              .from('bills')
              .upload(storagePath, fileBody, { contentType: file.mimeType })

            if (uploadError) {
              uploadErrors.push(`${file.name}: Storage upload failed — ${uploadError.message}`)
              continue
            }

            await supabase.from('bill_files').insert({
              expense_id: expenseId,
              storage_path: storagePath,
              file_name: file.name,
              uploaded_by: userId,
            })
          } catch (err) {
            uploadErrors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`)
          }
        }

        if (uploadErrors.length > 0) {
          Alert.alert('Upload Issue', uploadErrors.join('\n\n'))
        }

        router.replace('/(protected)')
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  if (initialLoading) {
    return (
      <ScreenLayout hideTabBar>
        <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading expense data…</Text>
        </View>
      </ScreenLayout>
    )
  }

  const categoryPickerOptions = [
    ...categories.map((c) => ({ type: 'category' as const, category: c })),
    { type: 'add-new' as const, category: null as Category | null },
  ]

  return (
    <ScreenLayout hideTabBar>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Text style={[styles.headerBackText, { color: theme.accent }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {isEditMode ? 'Edit expense' : 'New expense'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Amount + category row */}
        <View style={[styles.amountCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.currencySymbol, { color: theme.textSecondary }]}>₹</Text>
          <TextInput
            style={[styles.amountInput, { color: theme.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
            autoFocus={!isEditMode}
          />
        </View>

        {/* Main fields */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Paid by */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Paid by</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
            value={paidBy}
            onChangeText={setPaidBy}
            placeholder="Who paid?"
            placeholderTextColor={theme.textMuted}
          />

          {/* Category */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
          <Pressable
            style={[styles.pickerButton, { backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={[selectedCategoryId ? styles.pickerText : styles.pickerPlaceholder, { color: selectedCategoryId ? theme.text : theme.textMuted }]}>
              {selectedCategoryName || 'Select a category'}
            </Text>
            <Text style={{ color: theme.textMuted }}>▼</Text>
          </Pressable>

          {showNewCategoryInput && (
            <View style={styles.newCategoryRow}>
              <TextInput
                style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="New category name"
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              <Pressable style={[styles.smallButton, { backgroundColor: theme.accent }]} onPress={handleAddNewCategory}>
                <Text style={[styles.smallButtonText, { color: '#fff' }]}>Add</Text>
              </Pressable>
              <Pressable style={[styles.smallButton, { backgroundColor: theme.borderLight }]} onPress={() => {
                setShowNewCategoryInput(false)
                setNewCategoryName('')
              }}>
                <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {/* Date */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
            keyboardType="numbers-and-punctuation"
          />

          {/* Vendor */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Vendor (optional)</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
            value={vendor}
            onChangeText={setVendor}
            placeholder="Who was paid?"
            placeholderTextColor={theme.textMuted}
          />

          {/* Notes */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes…"
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Attachments section */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>Bill attachments</Text>

          {/* Existing files (edit mode) */}
          {isEditMode && existingFiles.filter((f) => !removedFileIds.includes(f.id)).length > 0 && (
            <View style={styles.existingSection}>
              {existingFiles.filter((f) => !removedFileIds.includes(f.id)).map((file) => (
                <View key={file.id} style={[styles.fileChip, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
                  <Text style={styles.fileIcon}>{file.isImage ? '🖼️' : '📄'}</Text>
                  <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{file.file_name}</Text>
                  <Pressable style={[styles.fileRemove, { backgroundColor: theme.destructive }]} onPress={() => removeExistingFile(file.id)}>
                    <Text style={styles.fileRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Removed files */}
          {isEditMode && removedFileIds.length > 0 && (
            <View style={styles.removedSection}>
              {existingFiles.filter((f) => removedFileIds.includes(f.id)).map((file) => (
                <View key={file.id} style={[styles.fileChip, { backgroundColor: theme.destructiveLight, borderColor: theme.destructive, opacity: 0.7 }]}>
                  <Text style={[styles.fileIcon, { opacity: 0.5 }]}>{file.isImage ? '🖼️' : '📄'}</Text>
                  <Text style={[styles.fileName, { color: theme.textMuted, textDecorationLine: 'line-through' }]} numberOfLines={1}>{file.file_name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Add files button */}
          <Pressable
            style={[styles.attachButton, { borderColor: theme.accent }]}
            onPress={() => setShowAttachmentMenu(true)}
          >
            <Text style={[styles.attachButtonText, { color: theme.accent }]}>+ Add photo or PDF</Text>
          </Pressable>

          {/* New file previews */}
          {selectedFiles.length > 0 && (
            <ScrollView horizontal style={styles.filePreviews} showsHorizontalScrollIndicator={false}>
              {selectedFiles.map((file, index) => (
                <View key={index} style={styles.filePreview}>
                  {file.isImage ? (
                    <Image source={{ uri: file.uri }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.pdfPreviewBox}>
                      <Text style={styles.pdfPreviewText}>PDF</Text>
                    </View>
                  )}
                  <Text style={[styles.previewFileName, { color: theme.textSecondary }]} numberOfLines={1}>{file.name}</Text>
                  <Pressable style={[styles.previewRemove, { backgroundColor: theme.destructive }]} onPress={() => removeNewFile(index)}>
                    <Text style={styles.previewRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Save button */}
        <Pressable
          style={[styles.saveButton, { backgroundColor: theme.accent }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditMode ? 'Save changes' : 'Save expense'}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} animationType="slide" transparent onRequestClose={() => setShowCategoryPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select category</Text>
            <FlatList
              data={categoryPickerOptions}
              keyExtractor={(item) => item.type === 'add-new' ? 'add-new' : item.category.id}
              renderItem={({ item }) => {
                if (item.type === 'add-new') {
                  return (
                    <Pressable style={[styles.optionRow, { borderBottomColor: theme.borderLight }]} onPress={() => {
                      setShowCategoryPicker(false)
                      setShowNewCategoryInput(true)
                    }}>
                      <Text style={[styles.addNewText, { color: theme.accent }]}>+ Add new category</Text>
                    </Pressable>
                  )
                }
                return (
                  <Pressable
                    style={[styles.optionRow, { borderBottomColor: theme.borderLight }, item.category.id === selectedCategoryId && { backgroundColor: theme.accentLight }]}
                    onPress={() => handleSelectCategory(item.category)}
                  >
                    <Text style={[styles.optionText, { color: theme.text }]}>{item.category.name}</Text>
                    {item.category.id === selectedCategoryId && (
                      <Text style={[styles.checkMark, { color: theme.accent }]}>✓</Text>
                    )}
                  </Pressable>
                )
              }}
            />
            <Pressable style={[styles.cancelButton, { backgroundColor: theme.borderLight }]} onPress={() => setShowCategoryPicker(false)}>
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Attachment Menu Modal */}
      <Modal visible={showAttachmentMenu} animationType="slide" transparent onRequestClose={() => setShowAttachmentMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAttachmentMenu(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Attach bill</Text>
            {[
              { label: 'Photo gallery', icon: '🖼️', action: pickFromGallery },
              { label: 'Take photo', icon: '📸', action: takePhoto },
              { label: 'Pick PDF', icon: '📄', action: pickPDF },
            ].map((opt) => (
              <Pressable key={opt.label} style={[styles.attachOption, { backgroundColor: theme.bg, borderColor: theme.borderLight }]} onPress={() => {
                setShowAttachmentMenu(false)
                opt.action()
              }}>
                <Text style={[styles.attachOptionText, { color: theme.text }]}>{opt.icon} {opt.label}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.cancelButton, { backgroundColor: theme.borderLight }]} onPress={() => setShowAttachmentMenu(false)}>
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenLayout>
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
  headerBackText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  headerSpacer: { width: 60 },

  // Loading
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 15 },

  // Amount card
  amountCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, padding: 24, marginBottom: 16,
  },
  currencySymbol: { fontSize: 28, fontWeight: 'bold', marginRight: 4, marginTop: 4 },
  amountInput: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', minWidth: 150 },

  card: { borderRadius: 18, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  pickerButton: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { fontSize: 15 },
  pickerPlaceholder: { fontSize: 15 },
  newCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  smallButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  smallButtonText: { fontSize: 14, fontWeight: '600' },

  // Files
  existingSection: { marginBottom: 4 },
  fileChip: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 12, marginBottom: 6, borderWidth: 1,
  },
  fileIcon: { fontSize: 16, marginRight: 8 },
  fileName: { flex: 1, fontSize: 13 },
  fileRemove: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  fileRemoveText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  removedSection: { marginBottom: 4 },

  attachButton: {
    borderWidth: 1, borderStyle: 'dashed', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  attachButtonText: { fontSize: 15, fontWeight: '600' },

  filePreviews: { marginTop: 12, flexDirection: 'row' },
  filePreview: { marginRight: 12, alignItems: 'center', position: 'relative' },
  thumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#ddd' },
  pdfPreviewBox: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#C1502E', justifyContent: 'center', alignItems: 'center' },
  pdfPreviewText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  previewFileName: { fontSize: 10, marginTop: 4, maxWidth: 80 },
  previewRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
  },
  previewRemoveText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  // Save button
  saveButton: {
    padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  optionRow: { padding: 14, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionText: { fontSize: 15 },
  checkMark: { fontSize: 18, fontWeight: 'bold' },
  addNewText: { fontWeight: '600' },
  cancelButton: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  cancelButtonText: { fontSize: 15, fontWeight: '600' },
  attachOption: { padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  attachOptionText: { fontSize: 15 },
})
