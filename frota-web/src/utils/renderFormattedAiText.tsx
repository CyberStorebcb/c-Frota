import { Fragment, type ReactNode } from 'react'

/**
 * Negrito `**texto**` num segmento sem quebras de linha.
 */
export function renderFormattedInline(text: string, keyPrefix: string): ReactNode {
  const re = /\*\*([^*]+)\*\*/g
  const nodes: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    nodes.push(
      <strong key={`${keyPrefix}-b-${k++}`} className="font-bold">
        {m[1]}
      </strong>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes.length === 0 ? text : nodes
}

/** Linha de lista: `*` + espaço + texto (não confunde com `**` porque exige espaço após o primeiro `*`). */
const BULLET_LINE = /^\s*\*\s+(.*)$/

/**
 * Blocos de texto e listas: linhas `* item` consecutivas viram `<ul>`;
 * o resto são parágrafos com `**negrito**` e quebras de linha suaves.
 */
export function renderFormattedText(text: string): ReactNode {
  const lines = text.split(/\r?\n/)
  const out: ReactNode[] = []
  let blockKey = 0
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const bulletMatch = line.match(BULLET_LINE)

    if (bulletMatch) {
      const items: string[] = []
      while (i < lines.length) {
        const L = lines[i] ?? ''
        const m = L.match(BULLET_LINE)
        if (!m) break
        items.push(m[1]!.trim())
        i++
      }
      const ulId = blockKey++
      out.push(
        <ul
          key={`ul-${ulId}`}
          className="my-2 list-disc space-y-1.5 pl-5 marker:text-current first:mt-0 last:mb-0"
        >
          {items.map((item, j) => (
            <li key={`li-${ulId}-${j}`} className="leading-relaxed">
              {renderFormattedInline(item, `li-${ulId}-${j}`)}
            </li>
          ))}
        </ul>,
      )
    } else {
      const start = i
      while (i < lines.length) {
        const L = lines[i] ?? ''
        if (L.match(BULLET_LINE)) break
        i++
      }
      const chunk = lines.slice(start, i).join('\n').trim()
      if (chunk) {
        const segments = chunk.split('\n')
        const pid = blockKey++
        out.push(
          <p key={`p-${pid}`} className="mb-2 last:mb-0">
            {segments.map((segment, idx) => (
              <Fragment key={`ln-${pid}-${idx}`}>
                {idx > 0 ? <br /> : null}
                {renderFormattedInline(segment, `p-${pid}-ln-${idx}`)}
              </Fragment>
            ))}
          </p>,
        )
      }
    }
  }

  return out.length === 0 ? text : out.length === 1 ? out[0] : <>{out}</>
}
