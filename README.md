## BillSwift — Smart Expense & Inventory Management System

BillSwift is a modern, mobile-first application designed to simplify **billing, expense tracking, and inventory management**. It combines real-time data handling, barcode scanning, and efficient backend services to streamline small business and personal finance workflows.

---

## 🚀 Features

### 📦 Inventory Management

* Add, update, and delete products
* Track stock levels in real time
* CSV import support for bulk inventory upload
* Categorization and search functionality

### 🧾 Billing System

* Generate bills quickly
* Automatic total calculation
* Maintain transaction history
* Optimized for fast checkout workflows

### 📷 Barcode Scanner

* Scan products using device camera
* Instant lookup and billing integration
* Flashlight support for low-light scanning

### 📊 Expense Tracking

* Record and manage expenses
* Categorize spending
* Analyze usage trends (extendable)

---

## 🛠️ Tech Stack

### Frontend (Mobile)

* React Native (Expo)
* TypeScript
* Camera & Barcode Scanner APIs

### Backend

* FastAPI (Python)
* RESTful API architecture

### Database

* SQL (relational database for structured data)

### Other Tools

* CSV parsing for data import
* Git & GitHub for version control

---

## 📁 Project Structure

```
BillSwift/
│── frontend/          # React Native (Expo) app
│── backend/           # FastAPI server
│── assets/            # Images, icons, static files
│── data/              # Sample CSVs / test data
│── README.md
```

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/BillSwift.git
cd BillSwift
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npx expo start
```

---

### 3. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 📄 CSV Import Notes

* Ensure CSV files:

  * Have proper headers (e.g., `name, price, quantity`)
  * Are encoded in UTF-8
  * Use `.csv` extension with correct MIME type

---

## 🔧 Key Challenges Solved

* Handling inconsistent CSV file formats and metadata
* Real-time syncing between scanner and billing module
* Efficient state management in React Native
* Backend API optimization for low latency

---

## 📈 Future Improvements

* Cloud deployment (AWS/GCP)
* User authentication & multi-user support
* Analytics dashboard
* Offline-first capability
* AI-based product recognition

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch (`feature/your-feature`)
3. Commit your changes
4. Push and create a Pull Request

---

## 📜 License

This project is open-source and available under the MIT License.

---

## 💡 Summary

BillSwift is built to be a **fast, scalable, and practical solution** for managing billing and inventory with minimal friction, making it ideal for small businesses and personal use.


## 📱 App Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/14b75ac5-a240-43ec-be72-842b8d62000c" width="240"/>
  <img src="https://github.com/user-attachments/assets/f2c7e960-b7ee-4c23-b9df-a2c6f33f1844" width="240"/>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/745c5c0a-4304-45cf-9bd2-dcf0423111e7" width="240"/>
  <img src="https://github.com/user-attachments/assets/1a31010e-32dc-4144-87cd-c595041085bc" width="240"/>
</p>


