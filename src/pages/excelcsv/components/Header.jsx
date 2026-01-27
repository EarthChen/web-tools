import { FileSpreadsheet, Download, Trash2, FileText, Table, Layers } from 'lucide-react'

export default function Header({ 
  fileInfo, 
  totalRows, 
  filteredCount, 
  sheetNames = [], 
  currentSheet, 
  onSwitchSheet,
  onExport, 
  onClear 
}) {
  const hasFile = !!fileInfo
  const hasFilter = filteredCount !== totalRows
  const hasMultipleSheets = sheetNames.length > 1

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
      <div className="max-w-full mx-auto flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">
              ExcelCSV Tool
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              CSV/Excel 互转工具
            </p>
          </div>
        </div>

        {/* File Info & Stats */}
        {hasFile && (
          <div className="hidden md:flex items-center gap-3 text-sm flex-1 justify-center">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px]">
                {fileInfo.name}
              </span>
              <span className="text-xs text-gray-500 uppercase">
                {fileInfo.type}
              </span>
            </div>
            
            {/* Sheet 选择器 */}
            {hasMultipleSheets && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <select
                  value={currentSheet || ''}
                  onChange={(e) => onSwitchSheet(e.target.value)}
                  className="text-sm text-blue-700 dark:text-blue-300 bg-transparent border-none focus:ring-0 cursor-pointer font-medium"
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name} className="text-gray-800">
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300">
                {hasFilter ? (
                  <>
                    <span className="font-semibold">{filteredCount.toLocaleString()}</span>
                    <span className="text-emerald-600/70 dark:text-emerald-400/70"> / {totalRows.toLocaleString()}</span>
                  </>
                ) : (
                  <span className="font-semibold">{totalRows.toLocaleString()} 行</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasFile && (
            <>
              {/* Export CSV */}
              <button
                onClick={() => onExport('csv')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="导出为 CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              
              {/* Export Excel */}
              <button
                onClick={() => onExport('xlsx')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                title="导出为 Excel"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              
              {/* Clear */}
              <button
                onClick={onClear}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="清除数据"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
