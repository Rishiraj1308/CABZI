# Curocity: The Firebase Firestore Query Guide

This document explains the common Firestore query patterns used in the Curocity application. It serves as a practical guide for understanding how we fetch and listen to data.

---

## 1. The Core Tool: The `firebase/firestore` SDK

All database operations use functions imported from `"firebase/firestore"`. The key functions we use are:

-   `collection()`: To get a reference to a specific collection (e.g., `partners`, `rides`).
-   `query()`: To build a query with conditions.
-   `where()`: To filter documents based on a field's value.
-   `orderBy()`: To sort the results.
-   `limit()`: To restrict the number of documents returned.
-   `getDocs()`: To fetch the results of a query **once**.
-   `onSnapshot()`: To listen for **real-time updates** to a query's results.

---

## 2. Query Pattern Examples

Here are examples based on code from the Admin Panel (`/admin/partners/page.tsx` and `/admin/customers/page.tsx`).

### Pattern 1: Conditional Query (The `where()` clause)

**Goal:** Fetch only the documents that meet a specific condition. This is the most common and powerful type of query.

**Example 1: Find all Riders**

This is how we fetch only users who are 'riders' from the `users` collection.

```javascript
import { db } from '@/lib/firebase';
import { collection, query, where } from 'firebase/firestore';

// This query will only look at documents in the 'users' collection 
// where the 'role' field is exactly equal to 'rider'.
const q = query(collection(db, "users"), where("role", "==", "rider"));
```

**Example 2: Find all Pending Partners**

This is how the Admin Panel finds all partners who are waiting for verification.

```javascript
import { db } from '@/lib/firebase';
import { collection, query, where } from 'firebase/firestore';

// This query looks at the 'partners' collection and gets only those
// documents where the 'status' field is 'pending_verification'.
const q = query(collection(db, "partners"), where("status", "==", "pending_verification"));
```

### Pattern 2: Real-time Query with Sorting

**Goal:** Get a live, sorted list of documents from a collection.

This pattern is used in the Admin Panel to show a real-time list of all partners, with the newest ones appearing first.

```javascript
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

// useEffect hook to run the query when the component mounts
useEffect(() => {
    // 1. Get a reference to the 'partners' collection.
    const partnersCollectionRef = collection(db, 'partners');
    
    // 2. Create a query. Here, we sort them by their creation date in descending order.
    const q = query(partnersCollectionRef, orderBy('createdAt', 'desc'));

    // 3. Set up the real-time listener.
    // This function automatically re-runs whenever data in 'partners' changes.
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const partnersData = [];
        querySnapshot.forEach((doc) => {
            partnersData.push({ id: doc.id, ...doc.data() });
        });
        
        // 4. Update the component's state with the new data.
        setPartners(partnersData);
    });

    // 5. Cleanup: Stop the listener when the component unmounts.
    return () => unsubscribe();
}, []);
```


### Pattern 3: Combining Multiple Queries

**Goal:** Fetch data from different collections and combine them into a single list.

The "Unified Partner Management" page uses this pattern to show Drivers, Mechanics, and Hospitals in one table.

```javascript
// This is a simplified example of the logic in `/admin/partners/page.tsx`

useEffect(() => {
    if (!db) return;

    // 1. Define all the collections you want to watch.
    const collectionsToWatch = [
        { name: 'partners', type: 'driver' },
        { name: 'mechanics', type: 'mechanic' },
        { name: 'ambulances', type: 'cure' }
    ];
    
    const unsubscribes = [];

    // 2. Loop and create a listener for each collection.
    for (const { name, type } of collectionsToWatch) {
        const q = query(collection(db, name), orderBy('createdAt', 'desc'));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                type: type, // IMPORTANT: Add a 'type' field to know where it came from.
                ...doc.data()
            }));
            
            // 3. Update a central state.
            setAllPartners(prev => {
                // Remove old data from this source and add the new data.
                const otherSources = prev.filter(p => p.type !== type);
                return [...otherSources, ...data];
            });
        });
        unsubscribes.push(unsub);
    }
    
    // Cleanup all listeners when the component unmounts.
    return () => unsubscribes.forEach(unsub => unsub());

}, [db]);

```

This guide covers the fundamental query patterns that power the real-time features of the Curocity application.
