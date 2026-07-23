import { Timestamp } from "firebase/firestore";
import { Fee } from "../fees/types";
import { ProofOfPayment, StudentFines } from "../fines/types";
import { Member } from "../members/types";

export type ImageData = {
    file: File;
    preview: string; // base64 or object URL for previewing the image
};
    

export type OnlinePaymentMethod = "gcash";

export type StudentFineItem = {
  refId: string;
  userId: string;
  fine: StudentFines;
  parentFineId: string;
  title: string;
  amount: number;
}

export type UnpaidDue = {
  id: string
  type: string
  name: string
  item: Fee | StudentFineItem 
  balance: number
  parentId?: string
}

export interface StudentUnpaidRecord {
  student: Member
  dues: UnpaidDue[]
}

export type PaidObject = {
  object: Fee & StudentFines;
  payment: ProofOfPayment;
}

export type Payment = {
  code: string;
  payer: string;
  type: string;
  status: string;
  items: PaidObject[];
  amount: number;
}

export interface StudentData {
  studentId: string;
  program: string;
  name: string;
  programShortName?: string;
  programAcronym?: string;
}

export interface TermData {
  AY: string;
  semester: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  acronym: string;
  outstandingAmount: number;
  statusStates?: Array<"unpaid" | "pending" | "rejected" | "verified">;
  paymentSummary?: {
    pending: number;
    verified: number;
    rejected: number;
    unpaid: number;
  };

  orgTreasurerName?: string;
  orgTreasurerUrl?: string;
  orgTreasurerNumber?: string;
  orgAuditorName?: string;
  orgAuditorUrl?: string;
  orgAuditorNumber?: string;
}

export interface FeeItem {
  id: string;
  description: string;
  title: string;
  amount: number;
  dueDate?: string;
  latestRejectionReason?: string;
  isPayable?: boolean;
  academicYear?: string;
  semester?: string;
  paymentState?: "unpaid" | "pending" | "rejected" | "verified";
}

export interface FineItem {
  refId: string;
  title: string;
  amount: number;
  parentFineId: string;
  isPaid: boolean;
  isPending: boolean;
  date: any;
  academicYear?: string;
  semester?: string;
}

export interface Fine {
  id: string;
  description: string;
  amount: number;
  date?: string;
  reason: string;
  latestRejectionReason?: string;
  isPayable?: boolean;
  paymentState?: "unpaid" | "pending" | "rejected" | "verified";
}

export interface SelectedPaymentItems {
  fees: FeeItem[];
  fines: Fine[];
  fineItems: FineItem[];
  feeAmount: number;
  fineAmount: number;
  totalAmount: number;
}


