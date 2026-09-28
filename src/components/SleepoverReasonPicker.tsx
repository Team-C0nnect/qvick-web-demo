import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import {
  SLEEPOVER_PIN_REASON_ETC,
  SLEEPOVER_PIN_REASON_OPTIONS,
} from '../utils/sleepover-pin';

interface SleepoverReasonPickerProps {
  id: string;
  value: string;
  placeholder: string;
  allowNoReason?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  onChange: (value: string) => void;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  transformOrigin: 'top center' | 'bottom center';
}

export default function SleepoverReasonPicker({
  id,
  value,
  placeholder,
  allowNoReason = false,
  disabled = false,
  invalid = false,
  describedBy,
  triggerRef,
  onChange,
}: SleepoverReasonPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const internalTriggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const options = [
    ...(allowNoReason ? [{ value: '', label: '사유 없음' }] : []),
    ...SLEEPOVER_PIN_REASON_OPTIONS.map((option) => ({
      value: option,
      label: option,
    })),
    {
      value: SLEEPOVER_PIN_REASON_ETC,
      label: `${SLEEPOVER_PIN_REASON_ETC} (직접 입력)`,
    },
  ];
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedLabel =
    selectedIndex >= 0 ? options[selectedIndex].label : placeholder;
  const menuId = `${id}-options`;

  const calculateMenuPosition = (menuHeight: number): MenuPosition | null => {
    const trigger = internalTriggerRef.current;
    if (!trigger) return null;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportInset = 8;
    const gap = 7;
    const availableAbove = Math.max(
      triggerRect.top - gap - viewportInset,
      0,
    );
    const availableBelow = Math.max(
      window.innerHeight - triggerRect.bottom - gap - viewportInset,
      0,
    );
    const maxMenuHeight = Math.min(264, window.innerHeight * 0.36);
    const desiredHeight = Math.min(menuHeight, maxMenuHeight);
    const opensAbove =
      availableBelow < desiredHeight && availableAbove > availableBelow;
    const availableHeight = opensAbove ? availableAbove : availableBelow;
    const width = Math.min(
      triggerRect.width,
      window.innerWidth - viewportInset * 2,
    );
    const left = Math.min(
      Math.max(triggerRect.left, viewportInset),
      window.innerWidth - viewportInset - width,
    );
    const visibleHeight = Math.min(desiredHeight, availableHeight);

    return {
      top: opensAbove
        ? Math.max(viewportInset, triggerRect.top - gap - visibleHeight)
        : Math.min(
            triggerRect.bottom + gap,
            window.innerHeight - viewportInset - visibleHeight,
          ),
      left,
      width,
      maxHeight: visibleHeight,
      transformOrigin: opensAbove ? 'bottom center' : 'top center',
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !pickerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    const updateMenuPosition = () => {
      const menu = menuRef.current;
      if (!menu) return;
      setMenuPosition(calculateMenuPosition(menu.scrollHeight));
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    if (isOpen) {
      const activeOption = optionRefs.current[activeIndex];
      activeOption?.focus({ preventScroll: true });
      activeOption?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  const openMenu = (initialIndex = Math.max(selectedIndex, 0)) => {
    const nextIndex = Math.min(Math.max(initialIndex, 0), options.length - 1);
    setActiveIndex(nextIndex);
    setMenuPosition(calculateMenuPosition(options.length * 38 + 10));
    setIsOpen(true);
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowDown') nextIndex = (index + 1) % options.length;
    if (event.key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = options.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveIndex(nextIndex);
      const nextOption = optionRefs.current[nextIndex];
      nextOption?.focus({ preventScroll: true });
      nextOption?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setMenuPosition(null);
      internalTriggerRef.current?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setMenuPosition(null);
    internalTriggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="sleepover-reason-picker" ref={pickerRef}>
      <button
        id={id}
        ref={(element) => {
          internalTriggerRef.current = element;
          if (triggerRef) triggerRef.current = element;
        }}
        type="button"
        className="sleepover-reason-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            setMenuPosition(null);
          } else {
            openMenu();
          }
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          const initialIndex =
            event.key === 'ArrowUp' && selectedIndex < 0
              ? options.length - 1
              : Math.max(selectedIndex, 0);
          openMenu(initialIndex);
        }}
      >
        <span>{selectedLabel}</span>
        <span
          className={`sleepover-reason-chevron ${isOpen ? 'open' : ''}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          className="sleepover-reason-menu"
          id={menuId}
          role="listbox"
          aria-label="외박 사유 선택"
          style={
            menuPosition
              ? {
                  top: menuPosition.top,
                  left: menuPosition.left,
                  width: menuPosition.width,
                  maxHeight: menuPosition.maxHeight,
                  transformOrigin: menuPosition.transformOrigin,
                }
              : undefined
          }
        >
          {options.map((option, index) => (
            <button
              key={option.value || 'none'}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={value === option.value}
              tabIndex={activeIndex === index ? 0 : -1}
              className="sleepover-reason-picker-option"
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => selectOption(option.value)}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <span className="sleepover-reason-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
