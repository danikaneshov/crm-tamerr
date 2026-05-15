# CRM Tamerr - Полная документация проекта

## 📋 Описание проекта

**CRM Tamerr** - это веб-приложение для управления сотрудниками и инвентарем, разработанное на React с использованием Firebase в качестве backend. Приложение предоставляет две основные роли: сотрудники и администраторы.

### Стек технологий
- **Frontend**: React 19, Vite, React Router v7
- **Backend**: Firebase (Authentication, Firestore)
- **Стили**: Tailwind CSS
- **Дополнительно**: Google Generative AI, Recharts (графики), XLSX (экспорт), Image Compression

---

## 🏗️ Архитектура приложения

```
CRM Tamerr
├── Сотрудники (Employee App)
│   ├── Регистрация и вход по PIN
│   ├── Управление сменами
│   ├── Отчеты о проделанной работе
│   └── Статистика
│
├── Администраторы (Admin Dashboard)
│   ├── Аутентификация (Email/Password)
│   ├── Управление сотрудниками
│   ├── Управление инвентарем
│   ├── Просмотр отчетов
│   └── Аналитика и статистика
│
└── Защита маршрутов (ProtectedRoute)
    └── Проверка статуса авторизации
```

---

## 🗄️ Структура данных Firebase

### ER Диаграмма

```
┌─────────────────────────────────────────────────────────────┐
│                         FIREBASE FIRESTORE                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│       employees (Collection)  │
├──────────────────────────────┤
│ ├─ uid: string (Document ID) │
│ ├─ name: string              │
│ ├─ email: string             │
│ ├─ pin: string               │
│ ├─ role: string              │
│ ├─ position: string          │
│ ├─ phone: string             │
│ ├─ status: string            │
│ ├─ createdAt: timestamp      │
│ └─ shifts: reference[]       │
└──────────────────────────────┘
           │
           │ references
           ▼
┌──────────────────────────────┐
│       shifts (Collection)     │
├──────────────────────────────┤
│ ├─ id: string (Document ID)  │
│ ├─ employeeId: string        │
│ ├─ date: timestamp           │
│ ├─ startTime: string         │
│ ├─ endTime: string           │
│ ├─ status: string            │
│ │   (scheduled/completed)    │
│ └─ duration: number          │
└──────────────────────────────┘

┌──────────────────────────────┐
│    reports (Collection)       │
├──────────────────────────────┤
│ ├─ id: string (Document ID)  │
│ ├─ employeeId: string        │
│ ├─ shiftId: string           │
│ ├─ description: string       │
│ ├─ tasks: object[]           │
│ ├─ images: string[]          │
│ ├─ submittedAt: timestamp    │
│ └─ status: string            │
└──────────────────────────────┘

┌──────────────────────────────┐
│    inventory (Collection)     │
├──────────────────────────────┤
│ ├─ id: string (Document ID)  │
│ ├─ name: string              │
│ ├─ category: string          │
│ ├─ quantity: number          │
│ ├─ unit: string              │
│ ├─ price: number             │
│ ├─ location: string          │
│ └─ lastUpdated: timestamp    │
└──────────────────────────────┘

┌──────────────────────────────┐
│    issues (Collection)        │
├──────────────────────────────┤
│ ├─ id: string (Document ID)  │
│ ├─ reportId: string          │
│ ├─ description: string       │
│ ├─ severity: string          │
│ │   (low/medium/high)        │
│ ├─ status: string            │
│ │   (open/in-progress/resolved)│
│ └─ createdAt: timestamp      │
└──────────────────────────────┘

┌──────────────────────────────┐
│  admins (Collection)          │
├──────────────────────────────┤
│ ├─ uid: string (Document ID) │
│ ├─ email: string             │
│ ├─ role: string              │
│ ├─ permissions: string[]     │
│ └─ createdAt: timestamp      │
└──────────────────────────────┘
```

---

## 📝 Основные Firestore запросы

### 1. **Аутентификация**

#### Вход администратора
```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const handleAdminLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Администратор вошел:', user.email);
    return user;
  } catch (error) {
    console.error('Ошибка входа:', error.message);
    throw error;
  }
};
```

#### Вход сотрудника по PIN
```javascript
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const loginEmployeeByPin = async (pin) => {
  try {
    const q = query(
      collection(db, 'employees'),
      where('pin', '==', pin)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Неверный PIN');
    }
    
    const employee = querySnapshot.docs[0].data();
    return { id: querySnapshot.docs[0].id, ...employee };
  } catch (error) {
    console.error('Ошибка входа:', error.message);
    throw error;
  }
};
```

---

### 2. **Управление сотрудниками**

#### Получить всех сотрудников
```javascript
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const getAllEmployees = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const employees = [];
    
    querySnapshot.forEach((doc) => {
      employees.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return employees;
  } catch (error) {
    console.error('Ошибка получения сотрудников:', error);
    throw error;
  }
};
```

#### Добавить нового сотрудника
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const addNewEmployee = async (employeeData) => {
  try {
    // Создаем аккаунт в Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      employeeData.email,
      'defaultPassword123' // Временный пароль
    );
    
    // Сохраняем данные сотрудника в Firestore
    const docRef = await addDoc(collection(db, 'employees'), {
      uid: userCredential.user.uid,
      name: employeeData.name,
      email: employeeData.email,
      pin: employeeData.pin,
      position: employeeData.position,
      phone: employeeData.phone,
      status: 'active',
      createdAt: serverTimestamp(),
      role: 'employee'
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Ошибка добавления сотрудника:', error);
    throw error;
  }
};
```

#### Обновить данные сотрудника
```javascript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const updateEmployee = async (employeeId, updates) => {
  try {
    const employeeRef = doc(db, 'employees', employeeId);
    await updateDoc(employeeRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('Сотрудник обновлен');
  } catch (error) {
    console.error('Ошибка обновления:', error);
    throw error;
  }
};
```

#### Удалить сотрудника
```javascript
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const deleteEmployee = async (employeeId) => {
  try {
    await deleteDoc(doc(db, 'employees', employeeId));
    console.log('Сотрудник удален');
  } catch (error) {
    console.error('Ошибка удаления:', error);
    throw error;
  }
};
```

---

### 3. **Управление сменами**

#### Создать смену
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const createShift = async (employeeId, shiftData) => {
  try {
    const docRef = await addDoc(collection(db, 'shifts'), {
      employeeId: employeeId,
      date: new Date(shiftData.date),
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      duration: shiftData.duration, // в часах
      status: 'scheduled',
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Ошибка создания смены:', error);
    throw error;
  }
};
```

#### Получить смены сотрудника
```javascript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const getEmployeeShifts = async (employeeId) => {
  try {
    const q = query(
      collection(db, 'shifts'),
      where('employeeId', '==', employeeId)
    );
    
    const querySnapshot = await getDocs(q);
    const shifts = [];
    
    querySnapshot.forEach((doc) => {
      shifts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return shifts;
  } catch (error) {
    console.error('Ошибка получения смен:', error);
    throw error;
  }
};
```

#### Завершить смену
```javascript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const completeShift = async (shiftId) => {
  try {
    const shiftRef = doc(db, 'shifts', shiftId);
    await updateDoc(shiftRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });
    
    console.log('Смена завершена');
  } catch (error) {
    console.error('Ошибка завершения смены:', error);
    throw error;
  }
};
```

---

### 4. **Отчеты о работе**

#### Создать отчет
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const submitReport = async (reportData) => {
  try {
    const docRef = await addDoc(collection(db, 'reports'), {
      employeeId: reportData.employeeId,
      shiftId: reportData.shiftId,
      description: reportData.description,
      tasks: reportData.tasks, // массив объектов с задачами
      images: reportData.images, // массив ссылок на изображения
      status: 'submitted',
      submittedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Ошибка отправки отчета:', error);
    throw error;
  }
};
```

#### Получить все отчеты
```javascript
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

const getAllReports = async () => {
  try {
    const q = query(
      collection(db, 'reports'),
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return reports;
  } catch (error) {
    console.error('Ошибка получения отчетов:', error);
    throw error;
  }
};
```

#### Получить отчеты по сотруднику
```javascript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const getEmployeeReports = async (employeeId) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('employeeId', '==', employeeId)
    );
    
    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return reports;
  } catch (error) {
    console.error('Ошибка получения отчетов:', error);
    throw error;
  }
};
```

---

### 5. **Управление инвентарем**

#### Получить все товары
```javascript
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const getAllInventory = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'inventory'));
    const items = [];
    
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return items;
  } catch (error) {
    console.error('Ошибка получения инвентаря:', error);
    throw error;
  }
};
```

#### Добавить товар
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const addInventoryItem = async (itemData) => {
  try {
    const docRef = await addDoc(collection(db, 'inventory'), {
      name: itemData.name,
      category: itemData.category,
      quantity: itemData.quantity,
      unit: itemData.unit, // шт, кг, л и т.д.
      price: itemData.price,
      location: itemData.location,
      lastUpdated: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Ошибка добавления товара:', error);
    throw error;
  }
};
```

#### Обновить количество товара
```javascript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const updateInventoryQuantity = async (itemId, quantity) => {
  try {
    const itemRef = doc(db, 'inventory', itemId);
    await updateDoc(itemRef, {
      quantity: quantity,
      lastUpdated: serverTimestamp()
    });
    
    console.log('Товар обновлен');
  } catch (error) {
    console.error('Ошибка обновления:', error);
    throw error;
  }
};
```

---

### 6. **Проблемы и жалобы**

#### Создать запись о проблеме
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const createIssue = async (issueData) => {
  try {
    const docRef = await addDoc(collection(db, 'issues'), {
      reportId: issueData.reportId,
      description: issueData.description,
      severity: issueData.severity, // 'low', 'medium', 'high'
      status: 'open',
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Ошибка создания проблемы:', error);
    throw error;
  }
};
```

#### Получить все открытые проблемы
```javascript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const getOpenIssues = async () => {
  try {
    const q = query(
      collection(db, 'issues'),
      where('status', 'in', ['open', 'in-progress'])
    );
    
    const querySnapshot = await getDocs(q);
    const issues = [];
    
    querySnapshot.forEach((doc) => {
      issues.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return issues;
  } catch (error) {
    console.error('Ошибка получения проблем:', error);
    throw error;
  }
};
```

---

## 🔒 Система аутентификации

### ProtectedRoute компонент

```javascript
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    // Слушаем изменения статуса авторизации
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthResolved(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authResolved) {
    return <div>Загрузка...</div>;
  }

  // Если пользователя нет, перенаправляем на логин
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Иначе показываем защищенный контент
  return children;
};

export default ProtectedRoute;
```

---

## 📊 Роли и разрешения

### Администратор
- ✅ Создавать/удалять сотрудников
- ✅ Управлять сменами
- ✅ Просматривать отчеты
- ✅ Управлять инвентарем
- ✅ Анализировать статистику
- ✅ Разрешать проблемы

### Сотрудник
- ✅ Просматривать свои смены
- ✅ Подавать отчеты о работе
- ✅ Загружать фото/документы
- ✅ Просматривать статистику (свою)
- ❌ Не может управлять другими сотрудниками

---

## 🚀 Развертывание

### Локальное развертывание

```bash
# Установить зависимости
npm install

# Запустить dev сервер
npm run dev

# Собрать для production
npm run build
```

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
VITE_FIREBASE_API_KEY=AIzaSyCUQ6IZ-eoAG8qCq5yoRklIl34kVUNCq2U
VITE_FIREBASE_AUTH_DOMAIN=crm-fifty.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=crm-fifty
VITE_FIREBASE_STORAGE_BUCKET=crm-fifty.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=37266175294
VITE_FIREBASE_APP_ID=1:37266175294:web:42118a3130c5b3e88de86f
```

---

## 📱 Основные маршруты приложения

```
/                    → Приложение для сотрудников
/admin/login         → Вход администратора
/admin               → Защищенная панель администратора
```

---

## 🔄 Ключевые функции

### Для сотрудников:
1. **Вход по PIN** - быстрая аутентификация
2. **Управление сменами** - просмотр и отслеживание рабочих смен
3. **Отправка отчетов** - описание проделанной работы с фото
4. **Статистика** - графики и аналитика личной производительности

### Для администраторов:
1. **Управление командой** - добавить/удалить/обновить сотрудников
2. **Расписание смен** - планирование и отслеживание
3. **Аналитика** - просмотр отчетов и KPI
4. **Инвентарь** - управление ресурсами и товарами
5. **Проблемы** - отслеживание и разрешение проблем

---

## 📞 Поддержка Firebase

Для дополнительной информации о работе с Firebase:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

---

**Последнее обновление**: 2026-05-15
**Версия**: 1.0.0
