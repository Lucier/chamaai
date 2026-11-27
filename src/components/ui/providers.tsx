"use client";

import clsx from "clsx";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";

/* ---------------- Toasts ---------------- */

type ToastType = "info" | "success" | "error";
type ToastItem = { id: number; message: string; type: ToastType };
type ToastFn = (message: string, type?: ToastType) => void;

/* ---------------- Confirmação ---------------- */

type ConfirmOptions = { title: string; message: string; confirmLabel?: string };
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ToastContext = createContext<ToastFn | null>(null);
const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <Providers>");
  return ctx;
};
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm precisa estar dentro de <Providers>");
  return ctx;
};

export function Providers({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback<ToastFn>((message, type = "info") => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === "error" ? 5000 : 3200);
  }, []);

  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);
  const close = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        dialog.resolve(false);
        setDialog(null);
      }
    };
    // capture: o Esc fecha só a confirmação, não o modal de perfil por baixo
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dialog]);

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {dialog && (
          <div
            className="fixed inset-0 z-[70] flex animate-fade-in items-start justify-center overflow-y-auto bg-[rgba(10,30,35,0.55)] p-4"
            onClick={(e) => e.target === e.currentTarget && close(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              className="mt-[20vh] w-full max-w-[420px] animate-rise rounded-xl bg-card p-6 shadow-modal md:mt-[12vh]"
            >
              <h2 id="confirm-title">{dialog.title}</h2>
              <p className="mt-2 mb-6 text-muted">{dialog.message}</p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                <Button variant="ghost" onClick={() => close(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={() => close(true)} autoFocus>
                  {dialog.confirmLabel ?? "Confirmar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] flex flex-col items-stretch gap-2 sm:inset-x-5 sm:bottom-5 sm:items-end print:hidden"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className={clsx(
                "pointer-events-auto animate-rise rounded-lg px-[18px] py-3 sm:max-w-[420px] text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)]",
                t.type === "success" && "bg-success",
                t.type === "error" && "bg-danger",
                t.type === "info" && "bg-ink",
              )}
            >
              {t.message}
            </div>
          ))}
        </div>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
