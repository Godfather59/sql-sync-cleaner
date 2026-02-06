import { useMemo, useState } from 'react'
import { Parser } from 'node-sql-parser'
import './App.css'

const normalizeColumnName = (columnName) =>
  String(columnName ?? '').trim().toLowerCase()

const parseInsertStatement = (sql, parser) => {
  if (!sql.trim()) {
    return { columns: [], warning: '' }
  }

  let parsedAst

  try {
    parsedAst = parser.astify(sql)
  } catch {
    return {
      columns: [],
      warning: 'Unable to parse SQL. Please check the query syntax.',
    }
  }

  const statements = Array.isArray(parsedAst) ? parsedAst : [parsedAst]

  if (statements.length !== 1) {
    return {
      columns: [],
      warning: 'Please provide exactly one INSERT statement.',
    }
  }

  const statement = statements[0]

  if (normalizeColumnName(statement?.type) !== 'insert') {
    return {
      columns: [],
      warning: 'Only INSERT statements are supported.',
    }
  }

  if (!Array.isArray(statement.columns) || statement.columns.length === 0) {
    return {
      columns: [],
      warning: 'INSERT statements must include an explicit column list.',
    }
  }

  return {
    columns: statement.columns.map((column) => String(column)),
    warning: '',
    statement,
    statements,
    isAstArray: Array.isArray(parsedAst),
  }
}

function App() {
  const parser = useMemo(() => new Parser(), [])

  const [inputSql, setInputSql] = useState('')
  const [selectedColumns, setSelectedColumns] = useState([])
  const [outputSql, setOutputSql] = useState('')
  const [actionWarning, setActionWarning] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  const parsedInput = useMemo(
    () => parseInsertStatement(inputSql, parser),
    [inputSql, parser],
  )
  const columns = parsedInput.columns
  const warning = actionWarning || parsedInput.warning

  const handleColumnToggle = (columnName) => {
    const normalized = normalizeColumnName(columnName)

    setSelectedColumns((previousSelections) => {
      if (previousSelections.includes(normalized)) {
        return previousSelections.filter((column) => column !== normalized)
      }

      return [...previousSelections, normalized]
    })
  }

  const handleInputChange = (event) => {
    setInputSql(event.target.value)
    setOutputSql('')
    setActionWarning('')
    setCopyStatus('')
  }

  const handleCleanQuery = () => {
    const result = parsedInput

    if (result.warning) {
      setActionWarning(result.warning)
      setOutputSql('')
      return
    }

    const selectedSet = new Set(selectedColumns)
    const currentColumns = result.statement.columns.map((column) => String(column))
    const columnsToKeep = []
    const indexesToKeep = []

    currentColumns.forEach((columnName, columnIndex) => {
      if (!selectedSet.has(normalizeColumnName(columnName))) {
        columnsToKeep.push(columnName)
        indexesToKeep.push(columnIndex)
      }
    })

    if (columnsToKeep.length === 0) {
      setActionWarning('At least one column must remain after cleaning.')
      setOutputSql('')
      return
    }

    const valueRows = result.statement.values?.values

    if (!Array.isArray(valueRows) || valueRows.length === 0) {
      setActionWarning('INSERT query does not contain VALUES rows to clean.')
      setOutputSql('')
      return
    }

    try {
      const cleanedValueRows = valueRows.map((row, rowIndex) => {
        if (!row || !Array.isArray(row.value)) {
          throw new Error(`Invalid VALUES row at position ${rowIndex + 1}.`)
        }

        if (row.value.length !== currentColumns.length) {
          throw new Error(
            `Column/value count mismatch at row ${rowIndex + 1}.`,
          )
        }

        return {
          ...row,
          value: indexesToKeep.map((index) => row.value[index]),
        }
      })

      const cleanedStatement = {
        ...result.statement,
        columns: columnsToKeep,
        values: {
          ...result.statement.values,
          values: cleanedValueRows,
        },
      }

      const cleanedAst = result.isAstArray ? [cleanedStatement] : cleanedStatement
      let cleanedSql = parser.sqlify(cleanedAst)

      if (!cleanedSql.trim().endsWith(';')) {
        cleanedSql = `${cleanedSql};`
      }

      setActionWarning('')
      setOutputSql(cleanedSql)
    } catch (error) {
      setActionWarning(error.message || 'Unable to clean query.')
      setOutputSql('')
    }
  }

  const handleCopy = async () => {
    if (!outputSql) {
      return
    }

    try {
      await navigator.clipboard.writeText(outputSql)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  return (
    <main className="app">
      <h1>SQL Insert Cleaner</h1>
      <div className="workspace">
        <section className="panel">
          <label className="panel-label" htmlFor="input-sql">
            Input SQL
          </label>
          <textarea
            id="input-sql"
            className="sql-textarea"
            placeholder="Paste INSERT query here..."
            value={inputSql}
            onChange={handleInputChange}
          />

          {warning && <p className="warning">{warning}</p>}

          <div className="columns-box">
            <h2>Columns to Remove</h2>
            {columns.length === 0 ? (
              <p className="muted">No columns detected yet.</p>
            ) : (
              <div className="columns-list">
                {columns.map((columnName, index) => {
                  const normalized = normalizeColumnName(columnName)
                  return (
                    <label className="checkbox-row" key={`${columnName}-${index}`}>
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(normalized)}
                        onChange={() => handleColumnToggle(columnName)}
                      />
                      <span>{columnName}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="actions">
            <button type="button" onClick={handleCleanQuery}>
              Clean Query
            </button>
            <button type="button" onClick={handleCopy} disabled={!outputSql}>
              Copy to Clipboard
            </button>
            {copyStatus && <span className="copy-status">{copyStatus}</span>}
          </div>
        </section>

        <section className="panel">
          <label className="panel-label" htmlFor="output-sql">
            Cleaned SQL
          </label>
          <textarea
            id="output-sql"
            className="sql-textarea"
            value={outputSql}
            readOnly
            placeholder="Cleaned query will appear here..."
          />
        </section>
      </div>
    </main>
  )
}

export default App
