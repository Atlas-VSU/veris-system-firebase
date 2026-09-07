import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { ReceiptData } from "@/components/organization/receipt/PaymentReceiptDialog";

interface SendReceiptEmailPayload {
  receiptData: ReceiptData;
  studentEmail: string;
  orgName?: string;
  orgLogoUrl?: string;
}

function buildReceiptHtml(data: ReceiptData, orgName: string, orgLogoUrl?: string): string {
  const itemRows = data.items
    .map(
      (i) =>
        `<tr>
          <td style="padding: 6px 0; font-size: 13px; color: #374151;">${i.name} <span style="font-size:11px;color:#6b7280;">(${i.type})</span></td>
          <td style="padding: 6px 0; font-size: 13px; color: #374151; text-align: right; font-weight: 600;">₱${i.amount.toLocaleString()}</td>
        </tr>`
    )
    .join("");

  const logoHtml = orgLogoUrl
    ? `<img src="${orgLogoUrl}" alt="${orgName}" width="48" height="48" style="border-radius:50%;border:1px solid #d1d5db;object-fit:cover;margin:0 auto 10px;display:block;" />`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Payment Receipt – ${data.receiptId}</title>
    </head>
    <body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px 28px;">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:20px;">
          ${logoHtml}
          <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">${orgName}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Official Payment Receipt</p>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

        <!-- Receipt meta -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#6b7280;">Receipt No.</td>
            <td style="font-size:12px;color:#111827;font-weight:600;text-align:right;">${data.receiptId}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#6b7280;padding-top:4px;">Date</td>
            <td style="font-size:12px;color:#374151;text-align:right;padding-top:4px;">${data.date}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#6b7280;padding-top:4px;">Term</td>
            <td style="font-size:12px;color:#374151;text-align:right;padding-top:4px;">${data.semester} Semester, A.Y. ${data.AY}</td>
          </tr>
        </table>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

        <!-- Student info -->
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Received From</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${data.studentName}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${data.studentId}</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

        <!-- Items -->
        <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Items Paid</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemRows}
        </table>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

        <!-- Total -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:16px;font-weight:700;color:#111827;">Total Paid</td>
            <td style="font-size:16px;font-weight:700;color:#111827;text-align:right;">₱${data.total.toLocaleString()}</td>
          </tr>
        </table>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

        <!-- Footer -->
        <div style="text-align:center;font-size:12px;color:#6b7280;">
          <p style="margin:0;">Payment Method: ${data.paymentMethod?.toUpperCase()}</p>
          <p style="margin:4px 0 0;">Verified by ${data.verifiedByName}</p>
        </div>

        <p style="margin:20px 0 0;text-align:center;font-size:11px;color:#9ca3af;">
          This serves as an official proof of payment. Please keep this for your records.
        </p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(req: NextRequest) {
  const { SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_APP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_EMAIL || !SMTP_APP_PASSWORD) {
    return NextResponse.json(
      { success: false, message: "Email service is not configured on the server." },
      { status: 503 }
    );
  }

  let body: SendReceiptEmailPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const { receiptData, studentEmail, orgName = "VERIS", orgLogoUrl } = body;

  if (!studentEmail || !receiptData) {
    return NextResponse.json(
      { success: false, message: "Missing required fields: studentEmail or receiptData." },
      { status: 400 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false, // STARTTLS
    auth: {
      user: SMTP_EMAIL,
      pass: SMTP_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${orgName}" <${SMTP_EMAIL}>`,
      to: studentEmail,
      subject: `Payment Receipt – ${receiptData.receiptId}`,
      html: buildReceiptHtml(receiptData, orgName, orgLogoUrl),
    });

    return NextResponse.json({ success: true, message: "Receipt sent successfully." });
  } catch (err: any) {
    console.error("[send-receipt-email] Nodemailer error:", err?.message ?? err);
    return NextResponse.json(
      { success: false, message: "Failed to send email. Please try again." },
      { status: 500 }
    );
  }
}
