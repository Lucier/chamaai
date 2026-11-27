import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// text-base (16px) em telas de toque (celular, inclusive deitado): abaixo disso o Safari/iOS dá zoom ao focar o campo.
// Com mouse (pointer-fine) volta aos 15px do desenho original.
const control =
  "w-full min-w-0 rounded-lg border border-line bg-white px-4 py-3 text-base leading-[1.4] text-ink outline-none pointer-fine:text-[15px] transition placeholder:text-[#9aa6ab] focus:border-primary focus:ring-[3px] focus:ring-primary/15 disabled:bg-surface aria-[invalid=true]:border-danger aria-[invalid=true]:bg-[#fffbfb]";

type Common = { label?: ReactNode; error?: string; hint?: ReactNode; className?: string };

/** Moldura de campo: rótulo, conteúdo e mensagem de erro. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
  footer,
}: Common & { htmlFor?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-1.5", className)}>
      {label &&
        (htmlFor ? (
          <label htmlFor={htmlFor} className="text-[13px] font-medium">
            {label}
          </label>
        ) : (
          <span className="text-[13px] font-medium">{label}</span>
        ))}
      {children}
      {hint && <div className="text-[13px] text-muted">{hint}</div>}
      {(error || footer) && (
        <div className="flex items-start justify-between gap-3">
          <div role={error ? "alert" : undefined} className="text-[13px] font-medium text-danger">
            {error}
          </div>
          {footer}
        </div>
      )}
    </div>
  );
}

export const Required = () => (
  <span className="text-danger" aria-hidden>
    *
  </span>
);

export function TextField({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <input id={id} aria-invalid={error ? true : undefined} className={clsx(control, "min-h-11")} {...rest} />
    </Field>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={clsx(control, "select-arrow min-h-11 cursor-pointer pr-[38px]")}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
}

export function TextareaField({
  label,
  error,
  hint,
  className,
  id,
  footer,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; footer?: ReactNode }) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className} footer={footer}>
      <textarea id={id} aria-invalid={error ? true : undefined} className={clsx(control, "min-h-[110px] resize-y")} {...rest} />
    </Field>
  );
}

export const controlClass = control;
