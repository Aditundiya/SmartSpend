import { doc, setDoc, runTransaction, writeBatch, deleteField } from "firebase/firestore";
import { db, PROFILES_COLLECTION } from "@/lib/firebase";
import { withLogging } from "@/lib/logger";

// Update a user profile
export const updateProfile = async (profileId: string, updates: Partial<any>): Promise<void> => {
    if (!profileId) throw new Error("Profile ID is required");

    return withLogging(
        `updateProfile ${profileId}`,
        async () => {
            const profileRef = doc(db, PROFILES_COLLECTION, profileId);
            // Use setDoc with merge: true so it creates the document if it doesn't exist
            await setDoc(profileRef, updates, { merge: true });
        },
        { profileId, updates }
    );
};

// Link two partners together
export const linkPartners = async (userUid: string, partnerUid: string): Promise<void> => {
    if (!userUid || !partnerUid) throw new Error("Both UIDs are required");
    if (userUid === partnerUid) throw new Error("You cannot link to yourself");

    return withLogging(
        `linkPartners ${userUid} <-> ${partnerUid}`,
        async () => {
            const userRef = doc(db, PROFILES_COLLECTION, userUid);
            const partnerRef = doc(db, PROFILES_COLLECTION, partnerUid);

            // Restored "Atomic Mutual Link".
            // We update both profiles in a single batch.
            // Permission for writing to partnerRef is granted by Firestore security rules IF:
            // 1. Partner slot is empty, OR
            // 2. Partner slot is already us (idempotent retry)

            const batch = writeBatch(db);
            batch.update(userRef, { partnerUid: partnerUid });
            batch.update(partnerRef, { partnerUid: userUid });

            await batch.commit();
        },
        { userUid, partnerUid }
    );
};

// Unlink two partners
export const unlinkPartners = async (userUid: string, partnerUid: string): Promise<void> => {
    return withLogging(
        `unlinkPartners ${userUid} <-> ${partnerUid}`,
        async () => {
            const userRef = doc(db, PROFILES_COLLECTION, userUid);
            // const partnerRef = doc(db, PROFILES_COLLECTION, partnerUid);

            const batch = writeBatch(db);

            // Single-sided unlink for reliability.
            // Revoking my partnerUid immediately prevents them from accessing my data (due to isPartner rule checking my doc).
            batch.update(userRef, { partnerUid: deleteField() });

            // Ideally we would unlink the partner too, but if permissions fail, we at least want to disconnect ourselves.
            // batch.update(partnerRef, { partnerUid: deleteField() });

            await batch.commit();
        },
        { userUid, partnerUid }
    );
};
