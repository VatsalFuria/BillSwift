import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, Bill } from "@/context/AppContext";

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

interface BillCardProps {
  bill: Bill;
  onDelete: (id: string) => void;
}

function BillCard({ bill, onDelete }: BillCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={bill.paymentMethod === "cash" ? styles.payBadgeCash : styles.payBadgeUpi}>
            <Ionicons
              name={bill.paymentMethod === "cash" ? "cash-outline" : "phone-portrait-outline"}
              size={12}
              color={bill.paymentMethod === "cash" ? Colors.cashGreen : Colors.upiBlue}
            />
            <Text style={bill.paymentMethod === "cash" ? styles.payBadgeTextCash : styles.payBadgeTextUpi}>
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
          <Text style={styles.itemCount}>{bill.items.length} item{bill.items.length !== 1 ? "s" : ""}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => onDelete(bill.id)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
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
                <Text style={styles.billItemCode}>{item.articleCode} × {item.quantity}</Text>
              </View>
              <Text style={styles.billItemTotal}>{formatCurrency(item.price * item.quantity)}</Text>
            </View>
          ))}
          {bill.paymentMethod === "cash" && bill.cashReceived > 0 && (
            <View style={styles.changeInfo}>
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Cash Received</Text>
                <Text style={styles.changeValue}>{formatCurrency(bill.cashReceived)}</Text>
              </View>
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Change Given</Text>
                <Text style={[styles.changeValue, { color: Colors.primary }]}>{formatCurrency(bill.change)}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function generateCSV(bills: Bill[]): string {
  const rows: string[] = [
    "Bill ID,Date,Time,Customer Name,Mobile,Payment,Total,Item Code,Item Name,Qty,Unit Price,Item Total"
  ];

  for (const bill of bills) {
    const date = formatDate(bill.date);
    const time = formatTime(bill.date);
    for (const item of bill.items) {
      rows.push([
        bill.id,
        date,
        time,
        bill.customerName || "",
        bill.customerMobile || "",
        bill.paymentMethod,
        bill.total.toFixed(2),
        item.articleCode,
        item.name,
        item.quantity,
        item.price.toFixed(2),
        (item.price * item.quantity).toFixed(2),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
  }

  return rows.join("\n");
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { bills, deleteBill } = useApp();
  const [exporting, setExporting] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const totalRevenue = bills.reduce((sum, b) => sum + b.total, 0);

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

  const handleExport = async () => {
    if (bills.length === 0) {
      Alert.alert("No Data", "There are no transactions to export.");
      return;
    }
    setExporting(true);
    try {
      const csv = generateCSV(bills);
      const fileName = `BillSwift_${new Date().toISOString().slice(0, 10)}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

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
      Alert.alert("Export Failed", "Could not export transactions. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSub}>{bills.length} transaction{bills.length !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          activeOpacity={0.8}
          disabled={exporting}
        >
          <Ionicons name="download-outline" size={18} color={Colors.white} />
          <Text style={styles.exportBtnText}>{exporting ? "Exporting..." : "Export CSV"}</Text>
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
            <BillCard bill={item} onDelete={handleDelete} />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
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
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.white },
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
  summaryValue: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.text },
  summaryLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  listContent: { padding: 12, gap: 10 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
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
  billTime: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textSecondary },
  customerName: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.secondary },
  cardRight: { alignItems: "flex-end", gap: 4 },
  billTotal: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.primary },
  itemCount: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textSecondary },
  cardActions: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 4 },
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
  billItemName: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.text },
  billItemCode: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  billItemTotal: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.text },
  changeInfo: {
    marginTop: 8,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  changeRow: { flexDirection: "row", justifyContent: "space-between" },
  changeLabel: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textSecondary },
  changeValue: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.text },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 80 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.textSecondary },
  emptyDesc: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
});
