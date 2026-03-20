import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { useAudioPlayer } from "expo-audio";
import {
  styles,
  SCAN_FRAME_WIDTH,
  SCAN_FRAME_HEIGHT,
} from "../../styles/ScanBill.styles";

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
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemCode}>{item.articleCode}</Text>
        {item.serial ? (
          <Text style={styles.itemSerial} numberOfLines={1}>
            SN: {item.serial}
          </Text>
        ) : null}
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
    cashierNote: string;
  }) => void;
}

function CheckoutModal({ visible, total, onClose, onConfirm }: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [cashierNote, setCashierNote] = useState("");

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = cashReceivedNum - total;

  useEffect(() => {
    if (visible) {
      setCashReceived(total.toString());
    }
  }, [visible, total]);

  const handleConfirm = () => {
    if (paymentMethod === "cash" && cashReceivedNum < total) {
      Alert.alert("Insufficient", "Cash received is less than the total amount.");
      return;
    }
    if (customerMobile.length > 0 && !/^[6-9]\d{9}$/.test(customerMobile)) {
      Alert.alert("Invalid Mobile", "Please enter a valid 10-digit mobile number.");
      return;
    }
    onConfirm({
      customerName,
      customerMobile,
      paymentMethod,
      cashReceived: cashReceivedNum,
      change: paymentMethod === "cash" ? change : 0,
      cashierNote,
    });
    setCustomerName("");
    setCustomerMobile("");
    setPaymentMethod("cash");
    setCashReceived(total.toString());
    setCashierNote("");
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
                onChangeText={(text) => {
                  const cleanText = text.replace(/[^0-9]/g, ""); // Removes non-numeric characters
                  setCustomerMobile(cleanText);
                }}
                maxLength={10} // Prevents typing more than 10 digits
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.paymentToggle}>
            <TouchableOpacity
              style={[
                styles.paymentBtn,
                paymentMethod === "cash" && styles.paymentBtnActive,
                paymentMethod === "cash" && {
                  backgroundColor: Colors.cashGreen,
                },
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
                <View
                  style={[
                    styles.changeRow,
                    {
                      backgroundColor:
                        change >= 0 ? Colors.primaryLight : Colors.errorLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.changeLabel,
                      { color: change >= 0 ? Colors.primary : Colors.error },
                    ]}
                  >
                    {change >= 0 ? "Change to Give" : "Shortfall"}
                  </Text>
                  <Text
                    style={[
                      styles.changeAmount,
                      { color: change >= 0 ? Colors.primary : Colors.error },
                    ]}
                  >
                    {formatCurrency(Math.abs(change))}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.inputRow}>
            <Ionicons
              name="document-attach-outline"
              size={18}
              color={Colors.textSecondary}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Cashier Note (optional)"
              placeholderTextColor={Colors.textSecondary}
              value={cashierNote}
              onChangeText={setCashierNote}
            />
          </View>

          <View style={styles.checkoutActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
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
  onAdd: (
    code: string,
    name: string,
    price: number,
    qty: number,
    serial?: string,
  ) => void;
}

function ManualAddModal({ visible, onClose, onAdd }: ManualAddModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [serial, setSerial] = useState("");

  const handleAdd = () => {
    const parsedPrice = parseFloat(price);
    const parsedQty = parseInt(qty);
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice <= 0 || !serial.trim()) {
      Alert.alert("Invalid", "Please enter a valid name, serial number, and price.");
      return;
    }
    onAdd(
      code.trim() || "MANUAL",
      name.trim(),
      parsedPrice,
      parsedQty || 1,
      serial.trim() || undefined,
    );
    setCode("");
    setName("");
    setPrice("");
    setQty("1");
    setSerial("");
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
              <TextInput
                style={styles.modalInput}
                placeholder="Article Code (optional)"
                placeholderTextColor={Colors.textSecondary}
                value={code}
                onChangeText={setCode}
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="pricetag-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.modalInput}
                placeholder="Item Name *"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.rupeeLabel}>₹</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Price *"
                placeholderTextColor={Colors.textSecondary}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.modalInput}
                placeholder="Serial *"
                placeholderTextColor={Colors.textSecondary}
                value={serial}
                onChangeText={setSerial}
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="layers-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.modalInput}
                placeholder="Quantity"
                placeholderTextColor={Colors.textSecondary}
                value={qty}
                onChangeText={setQty}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.checkoutActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleAdd}
              activeOpacity={0.8}
            >
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
  const {
    currentItems,
    currentTotal,
    addItem,
    updateItem,
    removeItem,
    clearBill,
    findArticleByCode,
    saveBill,
  } = useApp();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<
    "idle" | "found" | "notfound" | "duplicate"
  >("idle");
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);

  const scanLocked = useRef(false);
  const recentScans = useRef(new Map());

  const CACHE_WINDOW = 30000;
  const DUPLICATE_WINDOW = 15000;
  const LOCK_TIME = 600;

  const beepAudioSource = require("../../assets/sounds/u_edtmwfwu7c-beep-329314.mp3");
  const confirmAudioSource = require("../../assets/sounds/mixkit-page-forward-single-chime-1107.m4a");
  const beepSuccessSound = useAudioPlayer(beepAudioSource);
  const confirmSuccessSound = useAudioPlayer(confirmAudioSource);

  const handleBarcode = useCallback(
    (data: string) => {
      if (!data || scanLocked.current || data.length < 6) return;

      const start = performance.now();
      console.log("SCAN EVENT: ", data, " time: ", Date.now());


      const now = Date.now();
      const lastTime = recentScans.current.get(data);
      scanLocked.current = true;

      if (lastTime && now - lastTime < DUPLICATE_WINDOW) {
        setScanFeedback("duplicate");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        setTimeout(() => {
          setScanFeedback("idle");
          scanLocked.current = false;
        }, LOCK_TIME);

        return;
      }

      const article = findArticleByCode(data);

      if (article) {
        if (beepSuccessSound) {
          beepSuccessSound.seekTo(0);
          beepSuccessSound.play();
          console.log("Sound object:", beepSuccessSound.playing);
        }
        addItem({
          articleCode: article.code,
          name: article.name,
          price: article.price,
          quantity: 1,
          serial: article.serial ?? undefined,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScanFeedback("found");
        recentScans.current.set(data, now);

        for (const [code, time] of recentScans.current) {
          if (now - time > CACHE_WINDOW) {
            recentScans.current.delete(code);
          }
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setScanFeedback("notfound");
      }

      setTimeout(() => {
        setScanFeedback("idle");
        scanLocked.current = false;
      }, LOCK_TIME);

      
const end = performance.now();
console.log("SCAN HANDLER TIME:", end - start);

    },
    [findArticleByCode, addItem],
  );

  const handleCheckout = (data: {
    customerName: string;
    customerMobile: string;
    paymentMethod: "cash" | "upi";
    cashReceived: number;
    change: number;
    cashierNote: string;
  }) => {
    saveBill({ ...data, items: currentItems, total: currentTotal });
    setCheckoutVisible(false);
    if (confirmSuccessSound) {
      confirmSuccessSound.seekTo(0);
      confirmSuccessSound.play();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClearBill = () => {
    if (currentItems.length === 0) return;
    Alert.alert("Clear Bill?", "This will remove all items from the current bill.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
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
    scanFeedback === "found"
      ? Colors.success
      : scanFeedback === "notfound"
        ? Colors.error
        : Colors.scanHighlight;

  const totalItemCount = currentItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {scanning && (
        <View style={styles.scannerContainer}>
          {!cameraPermission?.granted ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.permTitle}>Camera Access Needed</Text>
              <Text style={styles.permDesc}>Allow camera to scan barcodes</Text>
              <TouchableOpacity
                style={styles.permBtn}
                onPress={requestCameraPermission}
                activeOpacity={0.8}
              >
                <Text style={styles.permBtnText}>Allow Camera</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={
                  scanLocked.current ? undefined : ({ data }) => handleBarcode(data)
                }
                barcodeScannerSettings={{
                  // barcodeTypes: ["ean13", "ean8", "code128", "code39", "upc_a", "upc_e"],
                  barcodeTypes: ["code39"],
                }}
              />

              <View style={styles.scanOverlay}>
                <View style={styles.overlayContainer} pointerEvents="none">
                  <View style={styles.overlayTop} />

                  <View style={styles.overlayMiddle}>
                    {/* <View style={styles.overlaySide} /> */}
                    <View style={{ width: SCAN_FRAME_WIDTH }} />
                    {/* <View style={styles.overlaySide} /> */}
                  </View>

                  <View style={styles.overlayBottom} />
                </View>

                <View style={styles.scanTopBar}>
                  <Text style={styles.scanSummary}>{totalItemCount} Items</Text>
                  <Text style={styles.scanSummaryAmount}>
                    {formatCurrency(currentTotal)}
                  </Text>
                </View>
                {scanFeedback !== "idle" && (
                  <View
                    style={[
                      styles.scanToast,
                      scanFeedback === "found"
                        ? styles.scanToastSuccess
                        : styles.scanToastError,
                    ]}
                  >
                    <Text style={styles.scanToastText}>
                      {scanFeedback === "found"
                        ? "✔ Item added"
                        : scanFeedback === "duplicate"
                          ? "⚠ Duplicate, Item already in cart"
                          : "⚠ Item not in inventory"}
                    </Text>
                  </View>
                )}

                <View style={styles.scanContent}>
                  <View style={styles.frameContainer}>
                    <View style={[styles.scanFrame, { borderColor: feedbackColor }]}>
                      <Animated.View
                        style={[styles.scanLine, { backgroundColor: feedbackColor }]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.scanBottomBar}>
                  <TouchableOpacity
                    style={styles.scanManualBtn}
                    onPress={() => setManualVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={22} color={Colors.white} />
                    <Text style={styles.scanBtnText}>Manual</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.billBtn}
                    onPress={() => setScanning(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="receipt-outline" size={22} color={Colors.white} />
                    <Text style={styles.scanBtnText}>View Bill</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
                {currentItems.length === 0
                  ? "Scan a barcode to start"
                  : `${currentItems.length} item${currentItems.length !== 1 ? "s" : ""}`}
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
              <Text style={styles.emptyDesc}>
                Tap the scan button below or add items manually
              </Text>
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
                style={[
                  styles.checkoutBtn,
                  currentItems.length === 0 && styles.checkoutBtnDisabled,
                ]}
                onPress={() => currentItems.length > 0 && setCheckoutVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={currentItems.length > 0 ? Colors.white : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.checkoutBtnText,
                    currentItems.length === 0 && styles.checkoutBtnTextDisabled,
                  ]}
                >
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
        onAdd={(code, name, price, qty, serial) => {
          addItem({
            articleCode: code,
            name,
            price,
            quantity: qty,
            serial: serial || "",
          });
        }}
      />
    </View>
  );
}
