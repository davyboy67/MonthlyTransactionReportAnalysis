import { useState } from 'react';
import { formatMonthLabel, formatLongDate, formatMonthName } from '@transaction-report/shared';
import type { CyclePayDays } from '@transaction-report/shared';
import { Modal } from '../../atoms/modal/Modal';

interface PayDayDialogProps {
  month: number;
  year: number;
  fileName: string;
  initial: CyclePayDays;
  onConfirm: (payDays: CyclePayDays) => void;
  onCancel: () => void;
}

function clampToMonth(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay));
}

function formatDay(date: Date): string {
  return formatLongDate(date);
}

export function PayDayDialog({
  month,
  year,
  fileName,
  initial,
  onConfirm,
  onCancel,
}: PayDayDialogProps) {
  const [previousMonth, setPreviousMonth] = useState(initial.previousMonth);
  const [targetMonth, setTargetMonth] = useState(initial.targetMonth);

  const previousDate = new Date(year, month - 2, 1);
  const start = clampToMonth(previousDate.getFullYear(), previousDate.getMonth(), previousMonth);
  const nextPay = clampToMonth(year, month - 1, targetMonth);
  const end = new Date(nextPay.getFullYear(), nextPay.getMonth(), nextPay.getDate() - 1);

  const valid = (day: number) => day >= 1 && day <= 31;
  const canConfirm = valid(previousMonth) && valid(targetMonth);

  return (
    <Modal title={`Report for ${formatMonthLabel(month, year)}`} onClose={onCancel}>
      <label className="modal-field">
        <span>Pay day in {formatMonthName(previousDate.getMonth() + 1)}</span>
        <input
          type="number"
          min={1}
          max={31}
          value={previousMonth}
          onChange={event => setPreviousMonth(Number(event.target.value))}
        />
      </label>
      <label className="modal-field">
        <span>Pay day in {formatMonthName(month)}</span>
        <input
          type="number"
          min={1}
          max={31}
          value={targetMonth}
          onChange={event => setTargetMonth(Number(event.target.value))}
        />
      </label>

      <p className="modal-note">
        {canConfirm ? (
          <>
            Covering {formatDay(start)} → {formatDay(end)} from {fileName}
            <br />
            Shifts to match the actual pay credit if one landed within 2 days of these dates.
          </>
        ) : (
          'Pay days must be between 1 and 31.'
        )}
      </p>

      <div className="modal-actions">
        <button className="tab-ghost-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="tab-primary-btn"
          disabled={!canConfirm}
          onClick={() => onConfirm({ previousMonth, targetMonth })}
        >
          Upload
        </button>
      </div>
    </Modal>
  );
}
