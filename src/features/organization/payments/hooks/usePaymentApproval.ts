/**
 * usePaymentApproval.ts
 *
 * Thin React hook that provides payment approval/rejection actions pre-filled
 * with the currently selected term and the acting admin's orgId.
 *
 * All business logic lives in paymentApprovalService.ts — this hook is purely
 * responsible for supplying React-context values (selected term, user) and
 * surfacing toast feedback.
 */

import { FineItem, ProofOfPayment, StudentFines } from "../../fines/types";
import { toast } from "sonner";
import { ReceiptData } from "@/components/organization/receipt/PaymentReceiptDialog";
import { useTermPeriod } from "../../term/hooks/useTermPeriod";
import { useAuth } from "@/hooks/useAuth";
import {
    approvePaymentService,
    rejectPaymentService,
    waiveFinePaymentService,
} from "../services/paymentApprovalService";


export const usePaymentApproval = () => {
    const { selected } = useTermPeriod();
    const { user } = useAuth();

    const _approvePayment = async (
        payment: ProofOfPayment,
    ): Promise<{ success: boolean; receipt: ReceiptData } | undefined> => {
        try {
            return await approvePaymentService(payment, selected, user?.orgId);
        } catch (error) {
            console.error("Failed payment approval.", error);
            toast.error("Failed payment approval, please contact the developer");
        }
    };

    const _rejectPayment = async (
        payment: ProofOfPayment,
        reason: string,
    ): Promise<{ success: boolean; message: string } | undefined> => {
        try {
            return await rejectPaymentService(payment, reason, selected);
        } catch (error) {
            console.error("Error rejecting payment.", error);
            toast.error("Failed payment rejection, please contact the developer");
        }
    };

    const _waiveFinePayment = async (
        fines: StudentFines,
        item: FineItem,
    ): Promise<void> => {
        try {
            await waiveFinePaymentService(fines, item, selected);
        } catch (error) {
            console.error("Failed fine waiver.", error);
            toast.error("Failed payment approval, please contact the developer");
        }
    };

    return {
        _approvePayment,
        _rejectPayment,
        _waiveFinePayment,
    };
};