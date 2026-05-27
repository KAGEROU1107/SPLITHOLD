'use client'

import { useRef, useState } from 'react'
import { Loader2, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { csrfFetch } from '@/lib/csrf-client'

interface Props {
  name: string
  currentUrl: string | null
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

export default function AvatarUpload({ name, currentUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)

      const res = await csrfFetch('/api/profile/avatar', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setPreviewUrl(currentUrl)
        toast.error(data.error ?? 'Gagal muat naik')
        return
      }
      setPreviewUrl(data.avatarUrl)
      toast.success('Gambar profil dikemas kini')
    } catch {
      setPreviewUrl(currentUrl)
      toast.error('Ralat sambungan')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:cursor-not-allowed"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-slate-500 select-none">{initials(name)}</span>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-5 w-5 text-white" />
          </span>
        )}

        {uploading && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          </span>
        )}
      </button>

      <div>
        <p className="text-xs font-medium text-slate-700">Gambar Profil</p>
        <p className="text-xs text-slate-400">JPG, PNG atau WEBP • Maks 2MB</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-1 text-xs text-brand-primary hover:underline disabled:opacity-50"
        >
          Tukar gambar
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
