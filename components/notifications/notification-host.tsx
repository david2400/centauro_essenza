/** @format */

"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/modals/scenes/dialog/alert-dialog";
import { cn } from "@repo/ui/utils";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineXCircle,
  HiXMark,
} from "react-icons/hi2";
import {
  confirmStore,
  dismissToast,
  toastStore,
  type ToastItem,
  type ToastTone,
} from "./store";

const TONE_STYLES: Record<ToastTone, { icon: typeof HiOutlineCheckCircle; className: string }> = {
  success: { icon: HiOutlineCheckCircle, className: "text-success" },
  error: { icon: HiOutlineXCircle, className: "text-destructive" },
  warning: { icon: HiOutlineExclamationTriangle, className: "text-warning" },
  info: { icon: HiOutlineInformationCircle, className: "text-primary" },
};

const EMPTY_TOASTS: ToastItem[] = [];

const Toast = ({ toast, closeLabel }: { toast: ToastItem; closeLabel: string }) => {
  useEffect(() => {
    if (!toast.duration) return;
    const timer = window.setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration]);

  const { icon: Icon, className } = TONE_STYLES[toast.tone];

  return (
    <li
      role={toast.tone === "error" ? "alert" : "status"}
      className='pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2'>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", className)} aria-hidden='true' />
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-semibold text-foreground'>{toast.title}</p>
        {toast.description ? (
          <p className='mt-0.5 break-words text-sm text-muted-foreground'>{toast.description}</p>
        ) : null}
      </div>
      <button
        type='button'
        onClick={() => dismissToast(toast.id)}
        aria-label={closeLabel}
        className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
        <HiXMark className='h-4 w-4' aria-hidden='true' />
      </button>
    </li>
  );
};

/**
 * Monta, una sola vez en el layout, la pila de notificaciones y el diálogo
 * de confirmación. Reemplaza los `Swal.fire` dispersos por una experiencia
 * consistente, accesible (role=status/alert, foco atrapado en el diálogo)
 * y alineada al sistema de diseño.
 */
export const NotificationHost = () => {
  const t = useTranslations("Notifications");
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.get, () => EMPTY_TOASTS);
  const request = useSyncExternalStore(confirmStore.subscribe, confirmStore.get, () => null);
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const inputId = useId();

  // Reinicia el campo de texto en cada nueva solicitud.
  useEffect(() => {
    setText(request?.input?.defaultValue ?? "");
    setTouched(false);
  }, [request?.id, request?.input?.defaultValue]);

  const missing = Boolean(request?.input?.required) && !text.trim();

  const close = (accepted: boolean) => {
    // Radix también avisa onOpenChange(false) tras pulsar la acción: si ya se respondió, no hacer nada.
    if (!request || confirmStore.get()?.id !== request.id) return;
    if (accepted && request.input) {
      if (missing) {
        setTouched(true);
        return;
      }
      request.resolve(text.trim());
    } else {
      // Confirmar sin campo de texto responde `true`; cancelar o cerrar, `false`.
      request.resolve(accepted);
    }
    confirmStore.set(null);
  };

  const fieldClass =
    "w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive";

  return (
    <>
      <ol
        aria-live='polite'
        className='pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:left-auto sm:right-6 sm:w-96'>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} closeLabel={t("close")} />
        ))}
      </ol>

      <AlertDialog open={request !== null} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{request?.title}</AlertDialogTitle>
            {request?.description ? (
              <AlertDialogDescription>{request.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          {request?.input ? (
            <div className='space-y-1.5'>
              <label htmlFor={inputId} className='text-sm font-medium text-foreground'>
                {request.input.label}
                {request.input.required ? <span className='ml-0.5 text-destructive'>*</span> : null}
              </label>
              {request.input.options ? (
                <select
                  id={inputId}
                  value={text}
                  autoFocus
                  aria-invalid={touched && missing}
                  onChange={(event) => setText(event.target.value)}
                  className={fieldClass}>
                  <option value=''>{request.input.placeholder ?? ""}</option>
                  {request.input.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : request.input.multiline ? (
                <textarea
                  placeholder={request.input.placeholder}
                  id={inputId}
                  rows={4}
                  value={text}
                  autoFocus
                  aria-invalid={touched && missing}
                  onChange={(event) => setText(event.target.value)}
                  className={fieldClass}
                />
              ) : (
                <input
                  id={inputId}
                  placeholder={request.input.placeholder}
                  value={text}
                  autoFocus
                  aria-invalid={touched && missing}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && close(true)}
                  className={fieldClass}
                />
              )}
              {touched && missing ? <p className='text-xs text-destructive'>{t("required")}</p> : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>
              {request?.cancelLabel ?? t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Con texto obligatorio vacío, el diálogo no se cierra.
                if (request?.input && missing) event.preventDefault();
                close(true);
              }}
              className={cn(
                request?.tone === "danger" &&
                  "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}>
              {request?.confirmLabel ?? t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
