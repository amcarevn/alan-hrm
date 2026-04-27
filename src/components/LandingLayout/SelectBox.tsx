import React, { useState, memo, useMemo } from "react";
import { Listbox, Combobox } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";

export interface SelectOption<T> {
  value: T;
  label: string;
}

interface SelectBoxProps<T> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  searchable?: boolean;
  size?: 'default' | 'lg';
}

function SelectBoxInner<T>({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchable = false,
  size = 'default',
}: SelectBoxProps<T>) {
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value) || null;

  const filteredOptions = useMemo(() => {
    const filtered = query === ""
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase())
        );

    // Limit to 100 results to keep UI snappy with large lists
    return filtered.slice(0, 100);
  }, [options, query]);

  const isLg = size === 'lg';
  const labelCls = isLg ? "block text-base font-semibold mb-1.5 text-gray-800" : "block text-sm font-medium mb-1 text-gray-700";
  const inputCls = isLg ? "w-full border-none py-[13px] pl-4 pr-10 text-base leading-normal text-gray-900 focus:ring-0" : "w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0";
  const wrapperCls = isLg
    ? "relative w-full cursor-default overflow-hidden rounded-xl bg-white text-left shadow-sm border-2 border-gray-200 hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
    : "relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-sm sm:text-sm border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500";
  const buttonCls = isLg
    ? "relative w-full cursor-pointer rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white py-[13px] pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-base shadow-sm transition-all"
    : "relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm shadow-sm";

  // COMBBOX MODE (Searchable)
  if (searchable) {
    return (
      <div className="w-full">
        {label && <label className={labelCls}>{label}</label>}
        <Combobox
          value={selected}
          onChange={(v: SelectOption<T> | null) => {
            if (v) onChange(v.value);
          }}
        >
          <div className="relative">
            <div className={wrapperCls}>
              <Combobox.Input
                className={inputCls}
                displayValue={(option: SelectOption<T> | null) => option?.label || ""}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder || "Tìm kiếm..."}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </Combobox.Button>
            </div>
            <Combobox.Options className="absolute z-50 mt-1 max-h-60 min-w-full w-max max-w-[min(32rem,90vw)] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredOptions.length === 0 && query !== "" ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Không tìm thấy kết quả.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <Combobox.Option
                    key={String(option.value)}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? "bg-blue-600 text-white" : "text-gray-900"
                      }`
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                          {option.label}
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? "text-white" : "text-blue-600"
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </div>
        </Combobox>
      </div>
    );
  }

  // LISTBOX MODE (Standard)
  const fallbackSelected = selected || (placeholder ? { value, label: placeholder } : options[0]);

  return (
    <div className="w-full">
      {label && <label className={labelCls}>{label}</label>}

      <Listbox value={fallbackSelected} onChange={(v: any) => onChange(v.value)}>
        <div className="relative">
          <Listbox.Button className={buttonCls}>
            <span className="block truncate">{fallbackSelected?.label || placeholder || "Chọn"}</span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Listbox.Options className="absolute z-50 mt-1 max-h-60 min-w-full w-max max-w-[min(32rem,90vw)] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {options.map((option) => (
              <Listbox.Option
                key={String(option.value)}
                value={option}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}

// Ensure the component is correctly typed when memoized
export const SelectBox = memo(SelectBoxInner) as typeof SelectBoxInner;


// ======== MultiSelectBox — chọn nhiều giá trị ========

interface MultiSelectBoxProps<T extends string> {
  label: string;
  value: T[];
  options: SelectOption<T>[];
  onChange: (value: T[]) => void;
  allLabel?: string;
}

function MultiSelectBoxInner<T extends string>({
  label,
  value,
  options,
  onChange,
  allLabel = 'Tất cả',
}: MultiSelectBoxProps<T>) {
  const allSelected = value.length === 0;
  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  const displayText = allSelected
    ? allLabel
    : selectedLabels.length <= 2
      ? selectedLabels.join(', ')
      : `${selectedLabels.length} loại đã chọn`;

  const toggle = (v: T) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>}
      <Listbox value={value} onChange={() => {}} multiple>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm shadow-sm">
            <span className="block truncate">{displayText}</span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 min-w-full w-max max-w-[min(32rem,90vw)] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {/* "Tất cả" option */}
            <div
              onClick={() => onChange([])}
              className={`relative cursor-pointer select-none py-2 pl-10 pr-4 hover:bg-blue-50 ${allSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-900'}`}
            >
              <span className="block truncate">{allLabel}</span>
              {allSelected && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
            </div>
            {options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <div
                  key={String(option.value)}
                  onClick={() => toggle(option.value)}
                  className={`relative cursor-pointer select-none py-2 pl-10 pr-4 hover:bg-blue-50 ${isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`}
                >
                  <span className={`block truncate ${isSelected ? 'font-medium' : 'font-normal'}`}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </div>
              );
            })}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}

export const MultiSelectBox = memo(MultiSelectBoxInner) as typeof MultiSelectBoxInner;
