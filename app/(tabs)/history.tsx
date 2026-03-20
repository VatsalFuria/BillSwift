import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { File, Directory, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, Bill } from "@/context/AppContext";
import { int } from "drizzle-orm/mysql-core";

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

interface BillCardProps {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
}

function BillCard({ bill, onEdit, onDelete }: BillCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View
            style={
              bill.paymentMethod === "cash" ? styles.payBadgeCash : styles.payBadgeUpi
            }
          >
            <Ionicons
              name={
                bill.paymentMethod === "cash" ? "cash-outline" : "phone-portrait-outline"
              }
              size={12}
              color={bill.paymentMethod === "cash" ? Colors.cashGreen : Colors.upiBlue}
            />
            <Text
              style={
                bill.paymentMethod === "cash"
                  ? styles.payBadgeTextCash
                  : styles.payBadgeTextUpi
              }
            >
              {bill.paymentMethod.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.billDate}>{formatDate(bill.date)}</Text>
          <Text style={styles.billTime}>{formatTime(bill.date)}</Text>
          {bill.customerName ? (
            <Text style={styles.customerName}>{bill.customerName}</Text>
          ) : null}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.billTotal}>{formatCurrency(bill.total)}</Text>
          <Text style={styles.itemCount}>
            {bill.items.length} item{bill.items.length !== 1 ? "s" : ""}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => onDelete(bill.id)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
            {/* // Update button shown here */}
            <TouchableOpacity
              onPress={() => onEdit(bill)}
              style={[styles.iconBtn, { backgroundColor: Colors.primaryLight }]}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={16} color={Colors.secondary} />
            </TouchableOpacity>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textSecondary}
            />
          </View>
        </View>
      </View>

      {expanded && (
        <View style={styles.itemsList}>
          <View style={styles.divider} />
          {bill.items.map((item) => (
            <View key={item.id} style={styles.billItemRow}>
              <View style={styles.billItemLeft}>
                <Text style={styles.billItemName}>{item.name}</Text>
                {item.serial ? (
                  <Text style={styles.billItemSerial}>SN: {item.serial}</Text>
                ) : null}
                <Text style={styles.billItemCode}>
                  {item.articleCode} × {item.quantity}
                </Text>
              </View>
              <Text style={styles.billItemTotal}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          {bill.paymentMethod === "cash" && bill.cashReceived > 0 && (
            <View style={styles.changeInfo}>
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Cash Received</Text>
                <Text style={styles.changeValue}>
                  {formatCurrency(bill.cashReceived)}
                </Text>
              </View>
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Change Given</Text>
                <Text style={[styles.changeValue, { color: Colors.primary }]}>
                  {formatCurrency(bill.change)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function BillForm({
  visible,
  bill,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  bill: Bill | null;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  React.useEffect(() => {
    if (visible && bill) {
      setNote(bill.cashierNote || "");
    }
  }, [visible, bill]);

  const handleSave = () => {
    const trimmed = note.trimEnd();

    if (trimmed.length > 200) {
      Alert.alert("Limit Exceeded", "Cashier note cannot exceed 200 characters.");
      return;
    }

    onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.nameModal}>
          <Text style={styles.modalTitle}>Edit Cashier Note</Text>

          <TextInput
            style={[styles.modalInput, { height: 100 }]}
            value={note}
            onChangeText={setNote}
            placeholder="Enter note (optional)"
            multiline
            maxLength={200}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function generateCSV(bills: Bill[]): string {
  const rows: string[] = [
    "Date,Time,Bill ID,Customer Name,Customer Mobile,Payment Method,Item Code,Item Serial,Item Name,Item Price,Item Qty,Item Total,Bill Total,Cashier Note",
  ];

  for (const bill of bills) {
    const date = formatDate(bill.date);
    const time = formatTime(bill.date);
    for (const item of bill.items) {
      rows.push(
        [
          date,
          time,

          bill.id,
          bill.customerName || "",
          bill.customerMobile || "",
          bill.paymentMethod,

          item.articleCode,
          item.serial,
          item.name,
          item.price.toFixed(2),
          item.quantity,
          (item.price * item.quantity).toFixed(2),

          bill.total.toFixed(2),
          bill.cashierNote,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
  }

  return rows.join("\n");
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { bills, deleteBill, updateBill, clearBills } = useApp();
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  // prompt state for user name before export/clear
  const [namePromptVisible, setNamePromptVisible] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [pendingAction, setPendingAction] = useState<"export" | "clear" | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const totalRevenue = bills.reduce((sum, b) => sum + b.total, 0);

  const medianRevenue = React.useMemo(() => {
    if (bills.length === 0) return 0;
    const sorted = bills.map((b) => b.total).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
      return sorted[mid]; // odd count – exact middle
    } else {
      return (sorted[mid - 1] + sorted[mid]) / 2; // even count – average of two middle
    }
  }, [bills]);

  const handleDelete = (id: string) => {
    Alert.alert("Delete Bill?", "This will permanently remove this transaction.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteBill(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const handleUpdate = (bill: Bill, cashierNote: string) => {
    Alert.alert(
      "Update Bill?",
      "This will update the Cashier Note for this transaction.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          style: "default",
          onPress: () => {
            if (bill.cashierNote === cashierNote) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return; // no change, just close
            }
            updateBill({ ...bill, cashierNote });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  // generic export function, includes user name in filename
  const doExport = async (userName: string) => {
    if (bills.length === 0) {
      Alert.alert("No Data", "There are no transactions to export.");
      return;
    }
    setExporting(true);
    try {
      const csv = generateCSV(bills);
      const date = new Date().toISOString().slice(0, 10);
      const safeName = userName.trim() || "Unknown";
      const fileName = `BillSwift_${safeName}_${date}.csv`;
      const file = new File(Paths.document, fileName);
      await file.write(csv);

      const fileUri = file.uri;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export Transactions",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Exported", `File saved to: ${fileUri}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("export failed", e);
      Alert.alert(
        "Export Failed",
        "Could not export transactions. Please try again. Error: " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setExporting(false);
    }
  };

  // wrapper used in UI handlers
  const showNamePrompt = (action: "export" | "clear") => {
    setNameInput("");
    setPendingAction(action);
    setNamePromptVisible(true);
  };

  const performPending = async () => {
    setNamePromptVisible(false);
    const userName = nameInput.trim();
    if (pendingAction === "export") {
      await doExport(userName);
    } else if (pendingAction === "clear") {
      setClearing(true);
      try {
        await doExport(userName);
        clearBills();
      } finally {
        setClearing(false);
      }
    }
    setPendingAction(null);
  };

  const handleExport = () => showNamePrompt("export");

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        {/* name entry modal */}
        <Modal visible={namePromptVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.nameModal}>
              <Text style={styles.modalTitle}>Enter file name for export</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Name"
                value={nameInput}
                onChangeText={setNameInput}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setNamePromptVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={performPending} style={styles.saveBtn}>
                  <Text style={styles.saveText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <View>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSub}>
            {bills.length} transaction{bills.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          activeOpacity={0.8}
          disabled={exporting || bills.length === 0}
        >
          <Ionicons name="download-outline" size={18} color={Colors.white} />
          <Text style={styles.exportBtnText}>
            {exporting ? "Exporting..." : "Export CSV"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.clearBtn, clearing && styles.exportBtnDisabled]}
          onPress={() => {
            Alert.alert(
              "End Session?",
              "This will export current history and then clear it. Continue?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "OK", onPress: () => showNamePrompt("clear") },
              ],
            );
          }}
          activeOpacity={0.8}
          disabled={clearing || bills.length === 0}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.white} />
          <Text style={styles.exportBtnText}>
            {clearing ? "Clearing..." : "Clear History"}
          </Text>
        </TouchableOpacity>
      </View>

      {bills.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{bills.length}</Text>
            <Text style={styles.summaryLabel}>Bills</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalRevenue / bills.length)}
            </Text>
            <Text style={styles.summaryLabel}>Avg Bill</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(medianRevenue)}</Text>
            <Text style={styles.summaryLabel}>Median Bill</Text>
          </View>
        </View>
      )}

      {bills.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyDesc}>Completed bills will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BillCard
              bill={item}
              onEdit={(bill) => {
                setEditingBill(bill);
                setFormVisible(true);
              }}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BillForm
        visible={formVisible}
        bill={editingBill}
        onClose={() => {
          setFormVisible(false);
          setEditingBill(null);
        }}
        onSubmit={(note) => {
          if (!editingBill) return;

          handleUpdate(editingBill, note);
          setFormVisible(false);
          setEditingBill(null);
        }}
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
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 24,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 44,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  nameModal: {
    width: "80%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  cancelText: { fontFamily: "Nunito_600SemiBold", color: Colors.error },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  saveText: { fontFamily: "Nunito_600SemiBold", color: Colors.primary },
  exportBtnDisabled: { opacity: 0.6 },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 44,
  },
  exportBtnText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: Colors.white,
  },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: "center",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: Colors.text,
  },
  summaryLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  listContent: { padding: 12, gap: 10 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLeft: { gap: 4 },
  payBadgeCash: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "#E8F5EE",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start" as const,
  },
  payBadgeUpi: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "#E8F0FA",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start" as const,
  },
  payBadgeTextCash: {
    fontFamily: "Nunito_700Bold" as const,
    fontSize: 10,
    color: Colors.cashGreen,
    letterSpacing: 0.5,
  },
  payBadgeTextUpi: {
    fontFamily: "Nunito_700Bold" as const,
    fontSize: 10,
    color: Colors.upiBlue,
    letterSpacing: 0.5,
  },
  billDate: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.text },
  billTime: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  customerName: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: Colors.secondary,
  },
  cardRight: { alignItems: "flex-end", gap: 4 },
  billTotal: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    color: Colors.primary,
  },
  itemCount: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.errorLight,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  itemsList: { marginTop: 4 },
  billItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  billItemLeft: { flex: 1 },
  billItemName: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  billItemCode: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  billItemSerial: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  billItemTotal: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  changeInfo: {
    marginTop: 8,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  changeRow: { flexDirection: "row", justifyContent: "space-between" },
  changeLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  changeValue: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    color: Colors.textSecondary,
  },
  emptyDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
