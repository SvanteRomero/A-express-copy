'use client'

import * as React from "react"
import { Input, type InputProps } from "./input"

const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputProps, "onChange" | "value"> & {
    value: number | string
    onValueChange: (value: number) => void
  }
>(({ value, onValueChange, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState("")

  React.useEffect(() => {
    const formattedValue = new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0)
    setDisplayValue(formattedValue)
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value: inputValue } = event.target
    const numericValue = Number(inputValue.replace(/[^0-9]/g, ""))

    if (!Number.isNaN(numericValue)) {
      onValueChange(numericValue)
    }
  }

  return <Input ref={ref} value={displayValue} onChange={handleChange} {...props} />
})

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
