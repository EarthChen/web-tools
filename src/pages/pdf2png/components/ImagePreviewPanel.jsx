import { useCallback } from 'react'

function ImagePreviewPanel({ 
  images, 
  onRemove, 
  onReorder, 
  onClear,
  onAddMore,
  onConvert,
  isConverting 
}) {
  const handleMoveUp = useCallback((index) => {
    if (index > 0) {
      const newOrder = [...images]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      onReorder(newOrder)
    }
  }, [images, onReorder])

  const handleMoveDown = useCallback((index) => {
    if (index < images.length - 1) {
      const newOrder = [...images]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      onReorder(newOrder)
    }
  }, [images, onReorder])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">
          已选择 {images.length} 张图片
        </h3>
        <div className="flex gap-2">
          <label className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length > 0) {
                  onAddMore(files)
                }
                e.target.value = ''
              }}
              className="hidden"
            />
            添加更多
          </label>
          <button
            onClick={onClear}
            className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
        {images.map((item, index) => (
          <div
            key={`${item.file.name}-${index}`}
            className="group relative bg-white/10 rounded-lg overflow-hidden"
          >
            <img
              src={item.preview}
              alt={item.file.name}
              className="w-full h-24 object-cover"
            />
            
            {/* 页码 */}
            <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              {index + 1}
            </div>

            {/* 操作按钮 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {/* 上移 */}
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="p-1 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed"
                title="上移"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              
              {/* 下移 */}
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === images.length - 1}
                className="p-1 bg-white/20 rounded hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed"
                title="下移"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* 删除 */}
              <button
                onClick={() => onRemove(index)}
                className="p-1 bg-red-500/50 rounded hover:bg-red-500/80"
                title="删除"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 文件名 */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
              <p className="text-white text-xs truncate">{item.file.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={onConvert}
          disabled={isConverting || images.length === 0}
          className="px-8 py-3 bg-white text-gray-800 rounded-xl font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          生成 PDF
        </button>
        <p className="text-white/50 text-sm mt-2">
          图片将按照上述顺序合成为 PDF 文件
        </p>
      </div>
    </div>
  )
}

export default ImagePreviewPanel
