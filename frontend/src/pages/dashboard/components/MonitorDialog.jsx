import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { intervalOptions, methodOptions } from '../dashboardData';

const ModalDropdown = ({ id, label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  const chooseOption = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div
      className="relative grid gap-1.5"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <span id={`${id}-label`} className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border-[3px] border-black bg-[#FDFBF7] px-3 text-left text-sm font-black text-slate-950 outline-none transition ${
          isOpen ? 'bg-white shadow-[3px_3px_0_#1E6BFF]' : 'hover:bg-[#FFF2A6] focus-visible:bg-white focus-visible:shadow-[3px_3px_0_#1E6BFF]'
        }`}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown
          size={18}
          strokeWidth={3}
          className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#1E6BFF]' : 'text-slate-950'}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-xl border-[3px] border-black bg-white p-1 shadow-[5px_5px_0_#0F172A]"
        >
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseOption(option.value)}
                className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-black text-slate-950 outline-none transition ${
                  selected
                    ? 'bg-[#00E676] shadow-[2px_2px_0_#0F172A]'
                    : 'bg-white hover:bg-[#FFD600] focus-visible:bg-[#FFD600]'
                }`}
              >
                <span>{option.label}</span>
                {selected && <Check size={17} strokeWidth={3} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MonitorDialog = ({
  form,
  isSaving,
  mode,
  onClose,
  onSubmit,
  onUpdate,
}) => {
  const isCreate = mode === 'create';

  return (
    <div className="fixed inset-0 z-[70] grid items-center overflow-y-auto bg-black/55 px-3 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-3xl overflow-visible rounded-2xl border-[3px] border-black bg-white shadow-[8px_8px_0_#0F172A]">
        <div className="flex items-center justify-between gap-4 rounded-t-[0.85rem] border-b-[3px] border-black bg-[#1E6BFF] px-4 py-3 text-white">
          <div>
            <h2 className="font-black uppercase italic">{isCreate ? 'New monitor' : 'Update monitor'}</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
              {isCreate ? 'Create a URL check for the monitor service' : 'Edit URL, method, interval and active state'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-white text-black shadow-[3px_3px_0_#0F172A]"
            aria-label={isCreate ? 'Close new monitor dialog' : 'Close update monitor dialog'}
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        <form className="grid gap-5 p-4 sm:p-6" onSubmit={onSubmit}>
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">URL</span>
            <input
              required
              type="url"
              value={form.url}
              onChange={(event) => onUpdate('url', event.target.value)}
              className="h-11 rounded-xl border-[3px] border-black bg-[#FDFBF7] px-3 text-sm font-bold outline-none focus:bg-white"
              placeholder="https://example.com/health"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <ModalDropdown
              id={`${mode}-method`}
              label="Method"
              value={form.method}
              options={methodOptions}
              onChange={(value) => onUpdate('method', value)}
            />

            <ModalDropdown
              id={`${mode}-interval`}
              label="Interval"
              value={form.interval}
              options={intervalOptions}
              onChange={(value) => onUpdate('interval', value)}
            />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border-[3px] border-black bg-[#FDFBF7] px-3 py-3">
            <span className="text-sm font-black text-slate-700">Active monitor</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => onUpdate('active', event.target.checked)}
              className="h-5 w-5 accent-[#1E6BFF]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 rounded-xl border-[3px] border-black bg-[#1E6BFF] text-sm font-black text-white shadow-[3px_3px_0_#0F172A] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (isCreate ? 'Creating...' : 'Saving...') : (isCreate ? 'Create monitor' : 'Save changes')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border-[3px] border-black bg-white text-sm font-black text-slate-950 hover:bg-[#FFD600]"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default MonitorDialog;
