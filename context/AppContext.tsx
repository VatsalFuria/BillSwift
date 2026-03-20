import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Article {
  id: string;
  code: string;
  name: string;
  price: number;
  // optional serial number for inventory tracking
  serial: string;
}

export interface BillItem {
  id: string;
  articleCode: string;
  name: string;
  price: number;
  quantity: number;
  // carry along serial when available
  serial: string;
}

export interface Bill {
  id: string;
  date: string;
  items: BillItem[];
  total: number;
  customerName: string;
  customerMobile: string;
  cashierNote: string;
  paymentMethod: "cash" | "upi";
  cashReceived: number;
  change: number;
}

interface AppContextValue {
  articles: Article[];
  addArticle: (article: Omit<Article, "id">) => void;
  updateArticle: (article: Article) => void;
  deleteArticle: (id: string) => void;
  findArticleByCode: (code: string) => Article | undefined;

  currentItems: BillItem[];
  addItem: (item: Omit<BillItem, "id">) => void;
  updateItem: (item: BillItem) => void;
  removeItem: (id: string) => void;
  clearBill: () => void;
  currentTotal: number;

  bills: Bill[];
  saveBill: (bill: Omit<Bill, "id" | "date">) => void;
  updateBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  clearBills: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const ARTICLES_KEY = "billswift_articles";
const BILLS_KEY = "billswift_bills";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentItems, setCurrentItems] = useState<BillItem[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [articlesJson, billsJson] = await Promise.all([
          AsyncStorage.getItem(ARTICLES_KEY),
          AsyncStorage.getItem(BILLS_KEY),
        ]);
        if (articlesJson) setArticles(JSON.parse(articlesJson));
        if (billsJson) setBills(JSON.parse(billsJson));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    })();
  }, []);

  const persistArticles = useCallback(async (data: Article[]) => {
    await AsyncStorage.setItem(ARTICLES_KEY, JSON.stringify(data));
  }, []);

  const persistBills = useCallback(async (data: Bill[]) => {
    await AsyncStorage.setItem(BILLS_KEY, JSON.stringify(data));
  }, []);

  const addArticle = useCallback(
    (article: Omit<Article, "id">) => {
      const newArticle = { ...article, id: generateId() };
      setArticles((prev) => {
        const updated = [...prev, newArticle];
        persistArticles(updated);
        return updated;
      });
    },
    [persistArticles],
  );

  const updateArticle = useCallback(
    (article: Article) => {
      setArticles((prev) => {
        const updated = prev.map((a) => (a.id === article.id ? article : a));
        persistArticles(updated);
        return updated;
      });
    },
    [persistArticles],
  );

  const deleteArticle = useCallback(
    (id: string) => {
      setArticles((prev) => {
        const updated = prev.filter((a) => a.id !== id);
        persistArticles(updated);
        return updated;
      });
    },
    [persistArticles],
  );

  const findArticleByCode = useCallback(
    (code: string) => {
      return articles.find((a) => a.code.toLowerCase() === code.toLowerCase());
    },
    [articles],
  );

  const addItem = useCallback((item: Omit<BillItem, "id">) => {
    setCurrentItems((prev) => {
      const existing = prev.find((i) => i.articleCode === item.articleCode);
      if (existing) {
        return prev.map((i) =>
          i.articleCode === item.articleCode
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        );
      }
      // carry serial through if supplied
      return [...prev, { ...item, id: generateId() }];
    });
  }, []);

  const updateItem = useCallback((item: BillItem) => {
    setCurrentItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setCurrentItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearBill = useCallback(() => {
    setCurrentItems([]);
  }, []);

  const currentTotal = useMemo(() => {
    return currentItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [currentItems]);

  const saveBill = useCallback(
    (bill: Omit<Bill, "id" | "date">) => {
      const newBill: Bill = {
        ...bill,
        id: generateId(),
        date: new Date().toISOString(),
      };
      setBills((prev) => {
        const updated = [newBill, ...prev];
        persistBills(updated);
        return updated;
      });
      setCurrentItems([]);
    },
    [persistBills],
  );

  const updateBill = useCallback(
    (bill: Bill) => {
      setBills((prev) => {
        const updated = prev.map((b) => (b.id === bill.id ? bill : b));
        persistBills(updated);
        return updated;
      });
    },
    [persistBills],
  );

  const deleteBill = useCallback(
    (id: string) => {
      setBills((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        persistBills(updated);
        return updated;
      });
    },
    [persistBills],
  );

  const clearBills = useCallback(() => {
    setBills([]);
    persistBills([]);
  }, [persistBills]);

  const value = useMemo(
    () => ({
      articles,
      addArticle,
      updateArticle,
      deleteArticle,
      findArticleByCode,
      currentItems,
      addItem,
      updateItem,
      removeItem,
      clearBill,
      currentTotal,
      bills,
      saveBill,
      updateBill,
      deleteBill,
      clearBills,
    }),
    [
      articles,
      addArticle,
      updateArticle,
      deleteArticle,
      findArticleByCode,
      currentItems,
      addItem,
      updateItem,
      removeItem,
      clearBill,
      currentTotal,
      bills,
      saveBill,
      updateBill,
      deleteBill,
      clearBills,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
