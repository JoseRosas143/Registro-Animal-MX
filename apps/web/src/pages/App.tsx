import { Routes, Route, Link } from 'react-router-dom'

export default function App() {
  return (
    <div>
      <h1>RegistroAnimalMX</h1>
      <nav>
        <Link to="/">Home</Link>
      </nav>
      <Routes>
        <Route path="/" element={<div>Bienvenido a RegistroAnimalMX</div>} />
      </Routes>
    </div>
  )
}