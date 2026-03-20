import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, Article } from "@/context/AppContext";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

interface ArticleFormProps {
  visible: boolean;
  initial?: Article | null;
  onClose: () => void;
  onSave: (data: { code: string; name: string; price: number; serial: string }) => void;
}

function ArticleForm({ visible, initial, onClose, onSave }: ArticleFormProps) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [serial, setSerial] = useState(initial?.serial ?? "");

  React.useEffect(() => {
    if (visible) {
      setCode(initial?.code ?? "");
      setName(initial?.name ?? "");
      setPrice(initial?.price?.toString() ?? "");
      setSerial(initial?.serial ?? "");
    }
  }, [visible, initial]);

  const handleSave = () => {
    const parsedPrice = parseFloat(price);
    if (!code.trim()) {
      Alert.alert("Required", "Please enter an article code.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Required", "Please enter an item name.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Invalid", "Please enter a valid price.");
      return;
    }
    if (!serial.trim()) {
      Alert.alert("Required", "Please enter a serial number.");
      return;
    }
    onSave({
      code: code.trim(),
      name: name.trim(),
      price: parsedPrice,
      serial: serial.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.formModal}>
          <View style={styles.handle} />
          <Text style={styles.formTitle}>{initial ? "Edit Article" : "Add Article"}</Text>
          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Ionicons name="barcode-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Article Code *"
                placeholderTextColor={Colors.textSecondary}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="pricetag-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Item Name *"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="Price *"
                placeholderTextColor={Colors.textSecondary}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Serial *"
                placeholderTextColor={Colors.textSecondary}
                value={serial}
                onChangeText={setSerial}
              />
            </View>
          </View>
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ArticleCardProps {
  article: Article;
  onEdit: (article: Article) => void;
  onDelete: (article: Article) => void;
}

function ArticleCard({ article, onEdit, onDelete }: ArticleCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.codeTag}>
          <Text style={styles.codeText}>{article.code}</Text>
        </View>
        <Text style={styles.cardName} numberOfLines={1}>
          {article.name}
        </Text>
        {article.serial ? (
          <Text style={styles.serialText} numberOfLines={1}>
            SN: {article.serial}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardPrice}>₹{article.price.toFixed(2)}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => onEdit(article)}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={18} color={Colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(article)}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const { articles, addArticle, updateArticle, deleteArticle } = useApp();
  const [search, setSearch] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.serial?.toLowerCase().includes(q),
    );
  }, [articles, search]);

  const handleSave = (data: {
    code: string;
    name: string;
    price: number;
    serial: string;
  }) => {
    if (editingArticle) {
      updateArticle({ ...editingArticle, ...data });
    } else {
      addArticle(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFormVisible(false);
    setEditingArticle(null);
  };

  const handleDelete = (article: Article) => {
    Alert.alert("Delete Article?", `Remove "${article.name}" from inventory?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteArticle(article.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;

      const file = new File(fileUri);
      const content = await file.text();

      processCSV(content);
    } catch (e) {
      Alert.alert("Import Failed", "Unable to read file.");
    }
  };

  const processCSV = (content: string) => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      Alert.alert("Invalid File", "CSV must contain header and at least one row.");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const required = ["code", "name", "price", "serial"];
    const missing = required.filter((r) => !headers.includes(r));

    if (missing.length > 0) {
      Alert.alert("Invalid CSV", `Missing columns: ${missing.join(", ")}`);
      return;
    }

    const indexMap: Record<string, number> = {};
    headers.forEach((h, i) => {
      indexMap[h] = i;
    });

    let added = 0;
    let duplicate = 0;
    const invalidRows: { code?: string; name?: string; serial?: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());

      const code = cols[indexMap["code"]];
      const name = cols[indexMap["name"]];
      const priceStr = cols[indexMap["price"]];
      const serial = cols[indexMap["serial"]];

      const price = parseFloat(priceStr);

      if (!code || !name || !serial || isNaN(price) || price <= 0) {
        invalidRows.push({ code, name, serial });
        continue;
      }

      const exists = articles.find((a) => a.code.toLowerCase() === code.toLowerCase());
      if (exists) {
        duplicate++;
        continue;
      }

      addArticle({
        code: code.trim(),
        name: name.trim(),
        price,
        serial: serial.trim(),
      });

      added++;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let message = `Processed: ${lines.length - 1}\nAdded: ${added}\nDuplicate: ${duplicate}\nInvalid: ${invalidRows.length}`;

    if (invalidRows.length > 0) {
      const preview = invalidRows
        .slice(0, 5)
        .map(
          (r) =>
            `Code: ${r.code ?? "-"} | Name: ${r.name ?? "-"} | Serial: ${r.serial ?? "-"}`,
        )
        .join("\n");

      message += `\n\nInvalid Rows (first 5):\n${preview}`;
    }

    Alert.alert("Import Summary", message);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          <Text style={styles.headerSub}>
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: Colors.secondary }]}
            onPress={handleImportCSV}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingArticle(null);
              setFormVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code or name..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>
            {search ? "No results found" : "No articles yet"}
          </Text>
          <Text style={styles.emptyDesc}>
            {search ? "Try a different search" : "Tap + to add your first article"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onEdit={(a) => {
                setEditingArticle(a);
                setFormVisible(true);
              }}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ArticleForm
        visible={formVisible}
        initial={editingArticle}
        onClose={() => {
          setFormVisible(false);
          setEditingArticle(null);
        }}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.text },
  headerSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  listContent: { padding: 12, gap: 8 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft: { flex: 1, gap: 6 },
  codeTag: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  codeText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  cardName: { fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.text },
  serialText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardRight: { alignItems: "flex-end", gap: 8 },
  cardPrice: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.text },
  cardActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.textSecondary },
  emptyDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  formModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  formTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
  },
  inputGroup: { gap: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  rupee: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.textSecondary },
  formActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.white },
});
