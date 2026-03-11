import React, { useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function QuizModal({ weapon, onClose, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const isCorrect = selected === weapon.quizAnswer
  const alreadyCompleted = weapon.completedBy?.includes(onComplete?.userId)

  const handleSubmit = () => {
    if (selected === null) return
    setSubmitted(true)
    if (isCorrect) {
      onComplete()
    }
  }

  const handleClose = () => {
    setSelected(null)
    setSubmitted(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-40 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-6 animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800">理解度チェック</h2>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Question */}
        <p className="text-sm text-gray-700 mb-4 leading-relaxed">{weapon.quizQuestion}</p>

        {/* Options */}
        <div className="space-y-2 mb-5">
          {weapon.quizOptions.map((opt, i) => {
            let style = 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
            if (submitted) {
              if (i === weapon.quizAnswer) style = 'border-green-500 bg-green-50 text-green-700'
              else if (i === selected) style = 'border-red-400 bg-red-50 text-red-600'
              else style = 'border-gray-200 bg-white text-gray-400'
            } else if (i === selected) {
              style = 'border-indigo-500 bg-indigo-50 text-indigo-700'
            }

            return (
              <button
                key={i}
                onClick={() => !submitted && setSelected(i)}
                disabled={submitted}
                className={`w-full text-left text-sm px-4 py-3 rounded-xl border-2 transition-all ${style}`}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Result */}
        {submitted && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {isCorrect
              ? <><CheckCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-medium">正解！習得済みとして記録しました。</span></>
              : <><XCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-medium">不正解。もう一度テキストを確認してみましょう。</span></>
            }
          </div>
        )}

        {/* Button */}
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors"
          >
            回答する
          </button>
        ) : (
          <button
            onClick={handleClose}
            className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  )
}
