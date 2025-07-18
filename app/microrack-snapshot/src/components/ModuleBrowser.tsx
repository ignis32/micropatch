import { useEffect, useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'

interface ModuleMeta {
  slug: string
  name: string
  shortDescription?: string
}

interface ModuleBrowserProps {
  onAddModule: (meta: any) => void;
}

function ModuleItem({ meta, onAddModule }: { meta: ModuleMeta, onAddModule: (meta: any) => void }) {
  // Для простоты весь div draggable, иконку можно убрать или сделать шапкой
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
    id: meta.slug,
    data: { meta }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging ? 0.4 : 1,
        border: "1px solid #444",
        padding: 7,
        borderRadius: 6,
        background: "#222",
        minHeight: 80,
        position: "relative",
        userSelect: "none", // чтобы не портить drag
        marginBottom: 8,
        cursor: "grab"
      }}
      onClick={() => onAddModule(meta)}
    >
      <div style={{
        width: "100%",
        borderBottom: "1px solid #333",
        padding: "3px 0",
        marginBottom: 6,
        fontWeight: 600,
        background: "#191b23"
      }}>
        <svg width="18" height="18" fill="#aaa" style={{verticalAlign: "middle", marginRight: 7}}><circle cx="9" cy="9" r="7"/></svg>
        {meta.name}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ fontSize: "0.9em", color: "#888", flex: 1 }}>
          {meta.shortDescription || (meta as any).description || ""}
        </div>
        <img
          src={`./modules/${meta.slug}/panel.png`}
          style={{ width: 30, height: 60, objectFit: "contain", background: "#222", flexShrink: 0 }}
          alt={meta.name}
          onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      </div>
    </div>
  );
}

export default function ModuleBrowser({ onAddModule }: ModuleBrowserProps) {
  const [modules, setModules] = useState<string[]>([])
  const [metas, setMetas] = useState<ModuleMeta[]>([])
  const [filterText, setFilterText] = useState('')

  const { setNodeRef, isOver } = useDroppable({ id: 'module-browser-dropzone' });

  useEffect(() => {
    fetch("./modules_index.json")
      .then(res => res.json())
      .then(setModules)
  }, [])

  useEffect(() => {
    Promise.all(modules.map(async slug => {
      const resp = await fetch(`./modules/${slug}/meta.json`)
      const meta = await resp.json()
      return { slug, ...meta }
    })).then(setMetas)
  }, [modules])

  // Filter modules based on search text
  const filteredMetas = metas.filter(meta => {
    if (!filterText.trim()) return true
    const searchText = filterText.toLowerCase()
    return meta.name.toLowerCase().includes(searchText) ||
           meta.slug.toLowerCase().includes(searchText) ||
           (meta.shortDescription || '').toLowerCase().includes(searchText)
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        height: "100%", overflowY: "auto", minWidth: 220,
        maxWidth: 260, borderRight: "1px solid #333", background: isOver ? "#2a2a2a" : "#161616",
        transition: 'background 0.2s'
      }}
      aria-label="Module Browser (Drop here to delete)"
    >
      <h2 style={{margin: "1em 0 0.5em 0"}}>Modules</h2>
      <input
        type="text"
        placeholder="Filter modules..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{
          width: 'calc(100% - 36px)',
          padding: '6px',
          marginBottom: '10px',
          margin: '0 8px',
          border: '1px solid #444',
          borderRadius: '4px',
          background: '#333',
          color: '#fff',
          fontSize: '12px',
          outline: 'none'
        }}
        onFocus={(e) => e.target.style.borderColor = '#61dafb'}
        onBlur={(e) => e.target.style.borderColor = '#444'}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredMetas.map(meta => <ModuleItem key={meta.slug} meta={meta} onAddModule={onAddModule} />)}
      </div>
      {isOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255,0,0,0.15)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 18,
          pointerEvents: 'none',
          zIndex: 10
        }}>
          Drop here to delete module
        </div>
      )}
    </div>
  )
}
