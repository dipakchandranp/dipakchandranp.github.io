import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { EditorHeader } from './EditorHeader'
import { EditorError } from './EditorError'

export function JsonEditor({ value, onChange, error, onReset }) {
  return (
    <div className="h-full flex flex-col">
      <EditorHeader onReset={onReset} />
      {error && <EditorError message={error} />}
      <div className="flex-1 border rounded-lg overflow-auto min-h-0">
        <CodeMirror
          value={value}
          height="auto"
          extensions={[json()]}
          onChange={onChange}
          theme="light"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
          }}
          className="text-sm"
        />
      </div>
    </div>
  )
}

