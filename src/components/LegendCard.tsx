import type { NodeKind } from '../types/domain';
import { getNodeStyle } from '../utils/colors';
import { KindGlyph } from './icons';
import { STATUS_LABELS, type StatusTone } from '../utils/status';

type Props = {
  /** 当前图里实际出现的对象类型。图例只解释看得见的东西。 */
  kinds: NodeKind[];
};

export default function LegendCard({ kinds }: Props) {
  if (kinds.length === 0) return null;

  return (
    <section className="border-b border-line px-4 py-4">
      <h3 className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">图例</h3>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-2">
        {kinds.map((kind) => {
          const style = getNodeStyle(kind);
          return (
            <li key={kind} className="flex min-w-0 items-center gap-2">
              <span
                className="grid size-5 shrink-0 place-items-center rounded-[6px]"
                style={{ backgroundColor: style.fill, color: style.stroke }}
                aria-hidden
              >
                <KindGlyph kind={kind} className="size-3" />
              </span>
              <span className="truncate text-[11px] text-ink-soft">{style.label}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 border-t border-line-soft pt-2.5">
        <h3 className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">状态</h3>
        <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-2">
          {(['ok', 'warn', 'danger', 'unknown'] as StatusTone[]).map((tone) => (
            <li key={tone} className="flex items-center gap-2">
              <span className={`dot ${tone}`} aria-hidden />
              <span className="text-[11px] text-ink-soft">{STATUS_LABELS[tone]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
