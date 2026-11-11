/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Link } from "@/shared/i18n/routing";
import { formatMoney } from "../../constants";
import type { IDevolution, IReturnCreditNote } from "../../models/devolution.interface";

/** Pagos reembolsados y notas crédito de una devolución reembolsada. */
export const RefundSummary = ({ devolution, creditNotes }: { devolution: IDevolution; creditNotes: IReturnCreditNote[] }) => {
  const tf = useTranslations("Administre.devolution.flow");
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <div className='rounded-xl border border-border/70 bg-background/60 p-5 text-sm'>
        <h3 className='text-base font-semibold text-foreground'>{tf("refundTitle")}</h3>
        {devolution.refund_detail ? (
          <ul className='mt-3 space-y-1'>
            {devolution.refund_detail.split("; ").map((item) => (
              <li key={item} className='font-mono text-xs'>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className='mt-3 text-muted-foreground'>{tf("noMoneyRefund")}</p>
        )}
      </div>
      <div className='rounded-xl border border-border/70 bg-background/60 p-5 text-sm'>
        <h3 className='text-base font-semibold text-foreground'>{tf("creditNoteTitle")}</h3>
        {creditNotes.length > 0 ? (
          <ul className='mt-3 space-y-2'>
            {creditNotes.map((note) => (
              <li key={note.id} className='flex items-center justify-between gap-2'>
                <Link
                  href={`/facturacion/invoices/${note.id}`}
                  className='font-mono font-semibold text-primary underline-offset-4 hover:underline'>
                  {note.full_number}
                </Link>
                <span className='flex items-center gap-2'>
                  <span className='tabular-nums'>{formatMoney(note.total)}</span>
                  <Badge variant={note.status === "ISSUED" ? "default" : "outline"}>{note.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='mt-3 text-muted-foreground'>{tf("noCreditNote")}</p>
        )}
      </div>
    </div>
  );
};
