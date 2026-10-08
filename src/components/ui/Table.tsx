import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
  )
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
)
TableBody.displayName = "TableBody"

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-[var(--border)] transition-colors hover:bg-[var(--accent)] data-[state=selected]:bg-[var(--accent)]",
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-heading text-[0.75rem] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider bg-[var(--background)]",
        className
      )}
      {...props}
    />
  )
)
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("p-4 align-middle text-[0.92rem] text-[var(--foreground)]", className)}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

/**
 * The pinned ⋯ column every list uses (same as Customers): it stays on the right edge while
 * wide tables scroll sideways, holds one RowActionsMenu, and never triggers the row's own click.
 */
const TableActionsHead = () => (
  <TableHead className="text-right sticky right-0 z-10 bg-[var(--background)] w-[60px]">
    <span className="sr-only">Actions</span>
  </TableHead>
)

const TableActionsCell = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <TableCell
    onClick={(e) => e.stopPropagation()}
    className={cn("text-right sticky right-0 z-10 bg-[var(--card)] w-[60px]", className)}
  >
    {children}
  </TableCell>
)

export {
  TableActionsHead,
  TableActionsCell,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
}
