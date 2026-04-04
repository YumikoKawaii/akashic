import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface FieldProps { label: string; children: ReactNode }
export function FormField({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement>
export function Input(props: InputProps) {
  return <input className="form-input" {...props} />
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
export function Select({ children, ...props }: SelectProps) {
  return <select className="form-input" {...props}>{children}</select>
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>
export function Textarea(props: TextareaProps) {
  return <textarea className="form-input" {...props} />
}
