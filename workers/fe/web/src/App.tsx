import { Chat } from './Chat'

export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>anoqi</h1>
        <span className="app__tag">Assistante santé féminine — version web (staging)</span>
      </header>
      <Chat />
      <footer className="app__footer">
        Anoqi informe, elle ne diagnostique pas. Consulte toujours ton médecin.
      </footer>
    </div>
  )
}
