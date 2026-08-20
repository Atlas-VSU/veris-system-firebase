/**
 * paymentApprovalService.ts
 *
 * Pure async service functions for approving and rejecting proof-of-payment
 * submissions. Zero React dependencies — safe to call from any Firebase
 * service module, server action, or React hook.
 *
 * The corresponding React hook (usePaymentApproval) should delegate to these
 * functions rather than own the business logic itself.
 */

import { rejectPaymentProof, verifyPaymentProof } from "@/firebase/payment/update/proofOfPayment";
import { FineItem, ProofOfPayment, StudentFines } from "../../fines/types";
import { generateReceiptId } from "../utils";
import { getPendingPaymentHistory } from "@/firebase/payment/read/paymentHistory";
import { getCurrentUserData, searchUserByStudentId } from "@/firebase/users";
import { Member } from "../../members/types";
import { rejectPaymentHistory, verifyPaymentHistory } from "@/firebase/payment/update/paymentHistory";
import { markFineItemAsWaived, markFineItemsAsNotPending, markFineItemsAsPaid } from "@/firebase/fines/update/fineItemsStatus";
import { ReceiptData } from "@/components/organization/receipt/PaymentReceiptDialog";
import { Timestamp } from "firebase/firestore";
import { recalculateClearanceStatus } from "@/firebase";
import { recalculateFines } from "@/firebase/fines/update/recalculate";
import { recalculateFees } from "@/firebase/fees/update/recalculate";
import { cacheService, CACHE_KEYS } from "@/services/cacheService";
import { updateFeeStats, updateFineStats } from "@/firebase/stats/update/updateStats";
import { getActiveTerm } from "@/firebase/term";
import { getOrgById } from "@/firebase/organization";
import { Term } from "@/constants/types";


/**
 * Approves a pending proof-of-payment submission.
 *
 * @param payment   - The ProofOfPayment document to approve.
 * @param term      - The currently selected term (falls back to the active term
 *                    from Firestore if not provided).
 * @param orgId     - The organisation ID of the acting admin (used to build the
 *                    receipt code via the org's shortName).
 * @returns Receipt data on success, or undefined on failure.
 */
export const approvePaymentService = async (
    payment: ProofOfPayment,
    term?: Term | null,
    orgId?: string | null,
): Promise<{ success: boolean; receipt: ReceiptData } | undefined> => {
    const resolvedTerm = term || await getActiveTerm();
    const verifier = await getCurrentUserData() as unknown as Member;

    const paymentOwner = await searchUserByStudentId(payment.studentId);
    if (!paymentOwner) {
        throw new Error("Payment owner not found, cannot verify payment.");
    }

    const resolvedOrgId = orgId || verifier.orgId;
    const org = await getOrgById(resolvedOrgId!);
    if (!org) {
        throw new Error("Organisation not found.");
    }

    const receipt = generateReceiptId(org.shortName);
    await verifyPaymentProof(payment, verifier, receipt);

    if (!payment.metadata.items?.length) {
        return undefined;
    }

    const items = payment.metadata.items;
    let parentFine = "";
    let fineItemIds: string[] = [];
    let totalFine = 0;

    for (const item of items) {
        if (item.paymentType === "fees") {
            await verifyPaymentHistory(item.historyId!, verifier, "fees", item.refId, item.amount, null, undefined, resolvedTerm);
            await updateFeeStats(`${resolvedTerm!.AY}-${resolvedTerm!.semester}-${verifier.orgId}`, 0, item.amount);
        }
        if (item.paymentType === "fines") {
            parentFine = item.parentFineId;
            fineItemIds.push(item.refId);
            totalFine += item.amount;
            await markFineItemsAsPaid(item.parentFineId, item.refId);
        }
    }

    if (parentFine !== "") {
        const paymentHistory = await getPendingPaymentHistory(parentFine, "fines", payment.id!);
        await verifyPaymentHistory(paymentHistory!.id, verifier, "fines", parentFine, totalFine, null, fineItemIds, resolvedTerm);
        await updateFineStats(`${resolvedTerm!.AY}-${resolvedTerm!.semester}-${verifier.orgId}`, 0, totalFine);
    }

    await recalculateClearanceStatus(paymentOwner.id!, resolvedTerm);

    // Invalidate proof-of-payment cache for the owner
    cacheService.invalidate(CACHE_KEYS.proofOfPaymentByUser(paymentOwner.id!, payment.orgId));

    const newReceiptData: ReceiptData = {
        receiptId: receipt,
        studentName: payment.userName,
        studentId: payment.studentId,
        items: items.map(d => ({ name: d.title, type: d.paymentType as "fees" | "fines", amount: d.amount })),
        total: payment.amount,
        date: Timestamp.now().toDate().toLocaleString(),
        verifiedByName: `${verifier.firstName} ${verifier.lastName}`,
        paymentMethod: payment.paymentMethod,
        AY: resolvedTerm!.AY,
        semester: resolvedTerm!.semester,
    };

    return { success: true, receipt: newReceiptData };
};


/**
 * Rejects a pending proof-of-payment submission.
 *
 * @param payment   - The ProofOfPayment document to reject.
 * @param reason    - Human-readable rejection reason surfaced to the student.
 * @param term      - The currently selected term (falls back to the active term).
 */
export const rejectPaymentService = async (
    payment: ProofOfPayment,
    reason: string,
    term?: Term | null,
): Promise<{ success: boolean; message: string } | undefined> => {
    const resolvedTerm = term || await getActiveTerm();
    const verifier = await getCurrentUserData() as unknown as Member;

    const paymentOwner = await searchUserByStudentId(payment.studentId);
    if (!paymentOwner) {
        throw new Error("Payment owner not found, cannot reject payment.");
    }

    await rejectPaymentProof(payment, verifier, reason);

    if (!payment.metadata.items?.length) {
        return undefined;
    }

    const items = payment.metadata.items;
    let parentFine = "";
    let fineItemIds: string[] = [];

    for (const item of items) {
        if (item.paymentType === "fees") {
            await rejectPaymentHistory(item.historyId!, verifier, "fees", item.refId, [], reason, resolvedTerm);
            await recalculateFees(item.refId, 0);
        }
        if (item.paymentType === "fines") {
            parentFine = item.parentFineId;
            fineItemIds.push(item.refId);
        }
    }

    if (parentFine !== "") {
        const paymentHistory = await getPendingPaymentHistory(parentFine, "fines", payment.id!);
        await rejectPaymentHistory(paymentHistory!.id, verifier, "fines", parentFine, fineItemIds, reason, resolvedTerm);
        await markFineItemsAsNotPending(parentFine, fineItemIds);
        await recalculateFines(parentFine, 0);
    }

    await recalculateClearanceStatus(paymentOwner.id!, resolvedTerm);

    // Invalidate proof-of-payment cache for the owner
    cacheService.invalidate(CACHE_KEYS.proofOfPaymentByUser(paymentOwner.id!, payment.orgId));

    return { success: true, message: "Payment was rejected" };
};


/**
 * Waives a single fine item on behalf of a student.
 *
 * @param fines  - The parent StudentFines document.
 * @param item   - The specific FineItem to waive.
 * @param term   - The currently selected term (falls back to the active term).
 */
export const waiveFinePaymentService = async (
    fines: StudentFines,
    item: FineItem,
    term?: Term | null,
): Promise<void> => {
    const resolvedTerm = term || await getActiveTerm();

    const paymentOwner = await searchUserByStudentId(fines.studentId);
    if (!paymentOwner) {
        throw new Error("Payment owner not found, cannot waive fine.");
    }

    await markFineItemAsWaived(fines.id!, item, undefined, resolvedTerm);
    await recalculateClearanceStatus(paymentOwner.id!, resolvedTerm);
    await updateFineStats(`${resolvedTerm!.AY}-${resolvedTerm!.semester}-${fines.orgId}`, 0, 0, item.amount);
};
