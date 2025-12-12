"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/core/input';
import { cn } from '@/lib/utils';

interface ComboboxProps {
  options: { label: string; value: string }[];
  value?: string;
  onChange: (value: string) => void;
  onInputChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SimpleCombobox({
  options,
  value,
  onChange,
  onInputChange,
  placeholder,
  className,
  disabled
}: ComboboxProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showOptions, setShowOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);

  // Only sync value from prop when not actively typing
  useEffect(() => {
    if (!isTypingRef.current) {
      setInputValue(value || '');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowOptions(false);
        isTypingRef.current = false;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    isTypingRef.current = true;
    setInputValue(newValue);
    onInputChange(newValue);
    setShowOptions(true);
  };

  const handleOptionClick = (optionValue: string, optionLabel: string) => {
    isTypingRef.current = false;
    setInputValue(optionLabel);
    onChange(optionValue);
    setShowOptions(false);
  };

  const handleBlur = () => {
    // Small delay to allow click events on options to fire first
    setTimeout(() => {
      isTypingRef.current = false;
    }, 200);
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowOptions(true)}
        onBlur={handleBlur}
        disabled={disabled}
      />
      {showOptions && options.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
          <ul>
            {options.map((option) => (
              <li
                key={option.value}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur from firing before click
                  handleOptionClick(option.value, option.label);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
