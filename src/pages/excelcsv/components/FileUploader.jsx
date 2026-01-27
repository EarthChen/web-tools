import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react'

export default function FileUploader({ onFileSelect, progress, isLoading }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && isValidFile(file)) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file && isValidFile(file)) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const isValidFile = (file) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    const validExtensions = ['.csv', '.xls', '.xlsx']
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className={`
          relative w-full max-w-2xl aspect-[4/3] rounded-2xl border-2 border-dashed
          transition-all duration-300 ease-out
          ${isDragging 
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 scale-[1.02]' 
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-750'
          }
          ${isLoading ? 'pointer-events-none' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          {isLoading ? (
            <>
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                正在解析文件...
              </p>
              
              {/* 进度条 */}
              <div className="w-full max-w-xs h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">{progress}%</p>
            </>
          ) : (
            <>
              <div className={`
                w-20 h-20 rounded-2xl flex items-center justify-center mb-6
                transition-all duration-300
                ${isDragging 
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' 
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg'
                }
              `}>
                {isDragging ? (
                  <FileSpreadsheet className="w-10 h-10 text-white" />
                ) : (
                  <Upload className="w-10 h-10 text-white" />
                )}
              </div>
              
              <p className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                {isDragging ? '释放以上传文件' : '拖放文件到这里'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                或点击选择文件
              </p>
              
              <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">CSV</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">XLS</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">XLSX</span>
              </div>
              
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
                支持 100MB+ 大文件，所有处理在本地完成
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
