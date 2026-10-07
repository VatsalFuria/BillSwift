# BillSwift — Smart POS & Inventory Management System
## 💡 Summary

BillSwift is a modern, mobile-first Point-of-Sale (POS) application engineered to streamline billing, inventory tracking, and expense management for small businesses. Built with an offline-first architecture, it leverages native device capabilities to deliver a high-speed, frictionless checkout experience.

---

## 🚀 Core Features

### 🧾 Lightning-Fast Billing Workflow

* **Real-Time Cart:** Scan barcodes to instantly add items to the cart with automatic total calculation.


* **Payment Splitting:** Built-in toggles to track transactions via Cash or UPI.


* **Change Calculation:** Automatically calculates change due for cash transactions to prevent cashier errors.


* **Custom Notes:** Append specific cashier notes to individual transactions for auditing.



### 📦 Robust Inventory Management

* **Bulk Operations:** Import inventory lists directly via CSV parsing.


* **Manual & Automated Entry:** Add items manually or update existing stock codes, serial numbers, and prices.


* **Live Search:** Filter and locate products instantly by code or name.



### 📷 Native Barcode Integration

* **Device Camera Scanner:** Utilizes `expo-camera` to scan Code39 barcodes.


* **Duplicate Prevention:** Built-in caching prevents accidental double-scanning within a 15-second window.


* **Haptic Feedback:** Provides physical confirmation of successful scans or errors using `expo-haptics`.



### 📊 Analytics & History

* **Session Insights:** View total revenue, total bills, average bill value, and median bill value at a glance.


* **Data Portability:** Export full transaction histories to CSV and share them natively via device sharing menus.


* **Transaction Editing:** Modify cashier notes on past bills without deleting the transaction record.



---

## 🛠️ Technical Architecture

BillSwift utilizes a modern JavaScript/TypeScript ecosystem, separating a fluid mobile frontend from a scalable Node.js backend environment.

### Frontend (Mobile)

* **Framework:** React Native with Expo.


* **Language:** TypeScript.


* **Routing:** Expo Router (File-based routing).


* **State Management:** React Context API paired with `@react-native-async-storage/async-storage` for offline-first data persistence.


* **Data Fetching:** `@tanstack/react-query`.


* **UI/UX:** `react-native-reanimated` for 60fps animations, `expo-glass-effect` for native iOS blurring, and `react-native-keyboard-controller` for seamless form inputs.



### Backend & Database

* **Server:** Express.js (Node.js).


* **Database ORM:** Drizzle ORM configured for PostgreSQL.


* **Schema Validation:** Zod.



---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/BillSwift.git
cd BillSwift
npm install

```

### 2. Start the Backend Server

The Express server handles API requests and database interactions.

```bash
npm run server:dev

```

### 3. Start the Frontend Application

The Expo development server supports Hot Module Reloading (HMR). Open a new terminal tab and run:

```bash
npm run expo:dev

```

*Note: Scan the generated QR code using the Expo Go app on your physical device, or press `i` to open in an iOS simulator or `a` for an Android emulator.*

---

## 📄 CSV Import Guidelines

To bulk import inventory, ensure your CSV files meet the following criteria:

* **Required Headers:** `code`, `name`, `price`, `serial`.


* **Data Types:** `price` must be a valid number greater than 0.


* The app will automatically reject invalid rows and skip duplicate article codes during import.



---

## 📱 App Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/14b75ac5-a240-43ec-be72-842b8d62000c" width="240"/>
  <img src="https://github.com/user-attachments/assets/f2c7e960-b7ee-4c23-b9df-a2c6f33f1844" width="240"/>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/745c5c0a-4304-45cf-9bd2-dcf0423111e7" width="240"/>
  <img src="https://github.com/user-attachments/assets/1a31010e-32dc-4144-87cd-c595041085bc" width="240"/>
</p>


