import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { router } from '@inertiajs/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ImportTasksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportTasksModal({ open, onOpenChange }: ImportTasksModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)
    
    if (!selectedFile) {
      setFile(null)
      return
    }
    
    // Kiểm tra loại file
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Vui lòng chọn file CSV')
      setFile(null)
      return
    }
    
    setFile(selectedFile)
  }

  const handleImport = () => {
    if (!file) {
      setError('Vui lòng chọn file CSV')
      return
    }
    
    setUploading(true)
    
    // Tạo FormData để upload file
    const formData = new FormData()
    formData.append('csv_file', file)
    
    // Sử dụng Inertia để gửi request
    router.post('/tasks/import', formData, {
      onSuccess: () => {
        setUploading(false)
        onOpenChange(false)
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      },
      onError: (errors) => {
        setUploading(false)
        setError(errors.csv_file || 'Đã xảy ra lỗi khi import tasks')
      }
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Tasks</DialogTitle>
          <DialogDescription>
            Import tasks quickly from a CSV file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="csv-file">File</Label>
            <Input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={uploading}
          >
            Close
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!file || uploading}
          >
            {uploading ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 