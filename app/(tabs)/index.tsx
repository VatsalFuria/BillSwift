import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  Vibration,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useApp, BillItem } from "@/context/AppContext";

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

interface ItemRowProps {
  item: BillItem;
  onUpdate: (item: BillItem) => void;
  onRemove: (id: string) => void;
}

function ItemRow({ item, onUpdate, onRemove }: ItemRowProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleQtyChange = (delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      onRemove(item.id);
      return;
    }
    onUpdate({ ...item, quantity: newQty });
    scale.value = withSequence(withTiming(1.08, { duration: 80 }), withSpring(1));
  };

  const handlePriceChange = (text: string) => {
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) onUpdate({ ...item, price: parsed });
  };

  return (
    <Animated.View style={[styles.itemRow, animatedStyle]}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemCode}>{item.articleCode}</Text>
      </View>
      <View style={styles.itemControls}>
        <View style={styles.priceInputWrap}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.priceInput}
            value={item.price.toString()}
            onChangeText={handlePriceChange}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => handleQtyChange(-1)}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={18} color={Colors.error} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => handleQtyChange(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.itemTotal}>{formatCurrency(item.price * item.quantity)}</Text>
      </View>
    </Animated.View>
  );
}

interface CheckoutModalProps {
  visible: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (data: {
    customerName: string;
    customerMobile: string;
    paymentMethod: "cash" | "upi";
    cashReceived: number;
    change: number;
  }) => void;
}

function CheckoutModal({ visible, total, onClose, onConfirm }: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [cashReceived, setCashReceived] = useState("");

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = cashReceivedNum - total;

  const handleConfirm = () => {
    if (paymentMethod === "cash" && cashReceivedNum < total) {
      Alert.alert("Insufficient", "Cash received is less than the total amount.");
      return;
    }
    onConfirm({
      customerName,
      customerMobile,
      paymentMethod,
      cashReceived: cashReceivedNum,
      change: paymentMethod === "cash" ? change : 0,
    });
    setCustomerName("");
    setCustomerMobile("");
    setPaymentMethod("cash");
    setCashReceived("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.checkoutModal}>
          <View style={styles.checkoutHandle} />
          <Text style={styles.checkoutTitle}>Checkout</Text>

          <Text style={styles.checkoutTotal}>{formatCurrency(total)}</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.modalInput}
                placeholder="Customer Name (optional)"
                placeholderTextColor={Colors.textSecondary}
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.modalInput}
                placeholder="Mobile Number (optional)"
                placeholderTextColor={Colors.textSecondary}
                value={customerMobile}
                onChangeText={setCustomerMobile}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.paymentToggle}>
            <TouchableOpacity
              style={[
                styles.paymentBtn,
                paymentMethod === "cash" && styles.paymentBtnActive,
                paymentMethod === "cash" && { backgroundColor: Colors.cashGreen },
              ]}
              onPress={() => setPaymentMethod("cash")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={paymentMethod === "cash" ? Colors.white : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.paymentBtnText,
                  paymentMethod === "cash" && styles.paymentBtnTextActive,
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentBtn,
                paymentMethod === "upi" && styles.paymentBtnActive,
                paymentMethod === "upi" && { backgroundColor: Colors.upiBlue },
              ]}
              onPress={() => setPaymentMethod("upi")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={paymentMethod === "upi" ? Colors.white : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.paymentBtnText,
                  paymentMethod === "upi" && styles.paymentBtnTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethod === "cash" && (
            <View style={styles.cashSection}>
              <View style={styles.inputRow}>
                <Text style={styles.rupeeLabel}>₹</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Cash Received"
                  placeholderTextColor={Colors.textSecondary}
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
              {cashReceivedNum > 0 && (
                <View style={[styles.changeRow, { backgroundColor: change >= 0 ? Colors.primaryLight : Colors.errorLight }]}>
                  <Text style={[styles.changeLabel, { color: change >= 0 ? Colors.primary : Colors.error }]}>
                    {change >= 0 ? "Change to Give" : "Shortfall"}
                  </Text>
                  <Text style={[styles.changeAmount, { color: change >= 0 ? Colors.primary : Colors.error }]}>
                    {formatCurrency(Math.abs(change))}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.checkoutActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={22} color={Colors.white} />
              <Text style={styles.confirmBtnText}>Confirm Bill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ManualAddModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (code: string, name: string, price: number, qty: number) => void;
}

function ManualAddModal({ visible, onClose, onAdd }: ManualAddModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");

  const handleAdd = () => {
    const parsedPrice = parseFloat(price);
    const parsedQty = parseInt(qty);
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Invalid", "Please enter a valid name and price.");
      return;
    }
    onAdd(code.trim() || "MANUAL", name.trim(), parsedPrice, parsedQty || 1);
    setCode(""); setName(""); setPrice(""); setQty("1");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.checkoutModal}>
          <View style={styles.checkoutHandle} />
          <Text style={styles.checkoutTitle}>Add Item Manually</Text>
          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Ionicons name="barcode-outline" size={18} color={Colors.textSecondary} />
              <TextInput style={styles.modalInput} placeholder="Article Code (optional)" placeholderTextColor={Colors.textSecondary} value={code} onChangeText={setCode} />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="pricetag-outline" size={18} color={Colors.textSecondary} />
              <TextInput style={styles.modalInput} placeholder="Item Name *" placeholderTextColor={Colors.textSecondary} value={name} onChangeText={setName} />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.rupeeLabel}>₹</Text>
              <TextInput style={styles.modalInput} placeholder="Price *" placeholderTextColor={Colors.textSecondary} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="layers-outline" size={18} color={Colors.textSecondary} />
              <TextInput style={styles.modalInput} placeholder="Quantity" placeholderTextColor={Colors.textSecondary} value={qty} onChangeText={setQty} keyboardType="number-pad" />
            </View>
          </View>
          <View style={styles.checkoutActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color={Colors.white} />
              <Text style={styles.confirmBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ScanBillScreen() {
  const insets = useSafeAreaInsets();
  const { currentItems, currentTotal, addItem, updateItem, removeItem, clearBill, findArticleByCode, saveBill } = useApp();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<"idle" | "found" | "notfound">("idle");
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const scanLocked = useRef(false);
  const scanBarScale = useSharedValue(1);

  const scanBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scanBarScale.value }],
    opacity: scanBarScale.value,
  }));

  const handleBarcode = useCallback((data: string) => {
    if (scanLocked.current) return;
    scanLocked.current = true;

    const article = findArticleByCode(data);
    if (article) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScanFeedback("found");
      addItem({ articleCode: article.code, name: article.name, price: article.price, quantity: 1 });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setScanFeedback("notfound");
    }

    scanBarScale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );

    setTimeout(() => {
      setScanFeedback("idle");
      scanLocked.current = false;
    }, 1500);
  }, [findArticleByCode, addItem]);

  const handleCheckout = (data: {
    customerName: string;
    customerMobile: string;
    paymentMethod: "cash" | "upi";
    cashReceived: number;
    change: number;
  }) => {
    saveBill({ ...data, items: currentItems, total: currentTotal });
    setCheckoutVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClearBill = () => {
    if (currentItems.length === 0) return;
    Alert.alert("Clear Bill?", "This will remove all items from the current bill.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All", style: "destructive",
        onPress: () => {
          clearBill();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const feedbackColor =
    scanFeedback === "found" ? Colors.success :
    scanFeedback === "notfound" ? Colors.error :
    Colors.scanHighlight;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {scanning && (
        <View style={styles.scannerContainer}>
          {!cameraPermission?.granted ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.permTitle}>Camera Access Needed</Text>
              <Text style={styles.permDesc}>Allow camera to scan barcodes</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestCameraPermission} activeOpacity={0.8}>
                <Text style={styles.permBtnText}>Allow Camera</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={({ data }) => handleBarcode(data)}
                barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"] }}
              />
              <View style={styles.scanOverlay}>
                <View style={[styles.scanFrame, { borderColor: feedbackColor }]}>
                  <Animated.View style={[styles.scanLine, { backgroundColor: feedbackColor }, scanBarStyle]} />
                </View>
                {scanFeedback === "notfound" && (
                  <View style={styles.scanMsg}>
                    <Text style={styles.scanMsgText}>Item not in inventory</Text>
                  </View>
                )}
                {scanFeedback === "found" && (
                  <View style={[styles.scanMsg, { backgroundColor: Colors.primaryLight }]}>
                    <Text style={[styles.scanMsgText, { color: Colors.primary }]}>Item added!</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.closeScanBtn} onPress={() => setScanning(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {!scanning && (
        <>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Scan & Bill</Text>
              <Text style={styles.headerSub}>
                {currentItems.length === 0 ? "Scan a barcode to start" : `${currentItems.length} item${currentItems.length !== 1 ? "s" : ""}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearBill}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>

          {currentItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barcode-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.emptyDesc}>Tap the scan button below or add items manually</Text>
            </View>
          ) : (
            <FlatList
              data={currentItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ItemRow item={item} onUpdate={updateItem} onRemove={removeItem} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!!currentItems.length}
            />
          )}

          <View style={[styles.bottomBar, { paddingBottom: bottomPad + 70 }]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatCurrency(currentTotal)}</Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.manualBtn}
                onPress={() => setManualVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={22} color={Colors.secondary} />
                <Text style={styles.manualBtnText}>Manual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setScanning(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="barcode-outline" size={26} color={Colors.white} />
                <Text style={styles.scanBtnText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkoutBtn, currentItems.length === 0 && styles.checkoutBtnDisabled]}
                onPress={() => currentItems.length > 0 && setCheckoutVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={22} color={currentItems.length > 0 ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.checkoutBtnText, currentItems.length === 0 && styles.checkoutBtnTextDisabled]}>
                  Pay
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      <CheckoutModal
        visible={checkoutVisible}
        total={currentTotal}
        onClose={() => setCheckoutVisible(false)}
        onConfirm={handleCheckout}
      />
      <ManualAddModal
        visible={manualVisible}
        onClose={() => setManualVisible(false)}
        onAdd={(code, name, price, qty) => {
          addItem({ articleCode: code, name, price, quantity: qty });
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
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.text },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  clearBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.errorLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 120 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.textSecondary },
  emptyDesc: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", paddingHorizontal: 40 },
  listContent: { padding: 12, gap: 8, paddingBottom: 20 },
  itemRow: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.text },
  itemCode: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  itemControls: { alignItems: "flex-end", gap: 6 },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rupee: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  priceInput: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    minWidth: 60,
    textAlign: "right",
    padding: 0,
  },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.text, minWidth: 24, textAlign: "center" },
  itemTotal: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.primary },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  totalAmount: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.primary },
  actionRow: { flexDirection: "row", gap: 10, paddingBottom: 4 },
  manualBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: Colors.secondary + "40",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  manualBtnText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.secondary },
  scanBtn: {
    flex: 2,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  scanBtnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
  checkoutBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  checkoutBtnDisabled: { backgroundColor: Colors.border },
  checkoutBtnText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.white },
  checkoutBtnTextDisabled: { color: Colors.textSecondary },
  scannerContainer: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  scanFrame: {
    width: 260,
    height: 160,
    borderWidth: 2.5,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  scanLine: {
    height: 3,
    width: "80%",
    borderRadius: 2,
  },
  scanMsg: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scanMsgText: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.error },
  closeScanBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: Colors.bg,
    padding: 32,
  },
  permTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.text },
  permDesc: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  permBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  permBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  checkoutModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  checkoutHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  checkoutTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.text, textAlign: "center" },
  checkoutTotal: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 38,
    color: Colors.primary,
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
  modalInput: {
    flex: 1,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  rupeeLabel: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.textSecondary },
  paymentToggle: { flexDirection: "row", gap: 12 },
  paymentBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  paymentBtnActive: { borderColor: "transparent" },
  paymentBtnText: { fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  paymentBtnTextActive: { color: Colors.white },
  cashSection: { gap: 10 },
  changeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  changeLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 14 },
  changeAmount: { fontFamily: "Nunito_800ExtraBold", fontSize: 18 },
  checkoutActions: { flexDirection: "row", gap: 12, marginTop: 4 },
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
  cancelBtnText: { fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  confirmBtn: {
    flex: 2,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  confirmBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.white },
});
