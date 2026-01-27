import { CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'

export default function StatusBar({ status }) {
  if (status.type === 'idle' || !status.message) {
    return (
      <footer className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <Info className="w-4 h-4" />
          <span>就绪 - 请上传 CSV 或 Excel 文件开始</span>
        </div>
      </footer>
    )
  }

  const statusConfig = {
    loading: {
      icon: Loader2,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300',
      iconClass: 'animate-spin',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      iconClass: '',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-700 dark:text-red-300',
      iconClass: '',
    },
  }

  const config = statusConfig[status.type] || statusConfig.loading
  const Icon = config.icon

  return (
    <footer className={`${config.bgColor} border-t border-gray-200 dark:border-gray-700 px-4 py-2 transition-colors duration-300`}>
      <div className={`flex items-center gap-2 text-sm ${config.textColor}`}>
        <Icon className={`w-4 h-4 ${config.iconClass}`} />
        <span>{status.message}</span>
      </div>
    </footer>
  )
}
